import { useState } from 'react';
import { db } from '@/api/db';
import { buildFallbackDraft } from './smartBuildRules';
import { getSerialNumbersArray } from './serialNumbers';

/**
 * Smart Project Builder hook.
 *
 * Build priority order (enforced in prompt + post-processing):
 *   1. Owned inventory — use real available assets first, substitute intelligently
 *   2. Roundtable partners — check partner inventory AND general fulfillment ability
 *   3. Suggested / Missing — ONLY after both above have been exhausted
 */
export function useSmartBuild() {
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const generate = async (inputs) => {
    setBuilding(true);
    setError(null);
    setUsedFallback(false);

    try {
      // ── 1. Fetch all context in parallel ──────────────────────────────────────
      const [assets, kits, shows, crewRoles, roundtableItems, roundtablePartners, calibrations] = await Promise.all([
        db.entities.Asset.list('-updated_date', 300).catch(() => []),
        db.entities.Kit.list('-created_date', 60).catch(() => []),
        db.entities.Show.list('-start_date', 8).catch(() => []),
        db.entities.CrewRole.list('-created_date', 60).catch(() => []),
        db.entities.RoundtableItem.list('-created_date', 200).catch(() => []),
        db.entities.RoundtablePartner.list('-created_date', 50).catch(() => []),
        db.entities.FulfillmentCalibration.filter({ is_active: true }, '-created_date', 200).catch(() => []),
      ]);

      // ── 2. Owned inventory context ────────────────────────────────────────────
      // Only available assets (not retired, not lost, not currently in active maintenance)
      const availableAssets = assets.filter(a =>
        a.status === 'available' &&
        !a.is_lost &&
        a.item_type !== 'consumable'
      );

      const inventoryLines = availableAssets
        .map(a => {
          const parts = [
            `"${a.name}"`,
            a.category || 'Misc',
            `qty:${a.quantity || 1}`,
            `$${a.daily_rate || 0}/day`,
            getSerialNumbersArray(a)[0] ? `sn:${getSerialNumbersArray(a)[0]}` : '',
          ].filter(Boolean);
          return parts.join(' | ');
        })
        .slice(0, 120)
        .join('\n');

      // Kit context
      const kitLines = kits
        .filter(k => k.status === 'available' || !k.status)
        .map(k => `"${k.name}" | ${k.kit_type} | $${k.daily_rate || 0}/day`)
        .join('\n');

      // ── 3. Roundtable context — partners + their inventory ────────────────────
      // Active partners with their categories/specialties
      const activePartners = roundtablePartners.filter(p => p.is_active !== false);
      const partnerLines = activePartners
        .map(p => `"${p.name}" | can_fulfill_general_requests:true${p.categories ? ` | specialties:${p.categories}` : ''}${p.notes ? ` | notes:${p.notes}` : ''}`)
        .join('\n');

      // Partner-listed items (explicit inventory they offer)
      const availableRoundtableItems = roundtableItems.filter(ri => ri.is_available !== false);
      const roundtableItemLines = availableRoundtableItems
        .map(ri => `"${ri.name}" | ${ri.category || 'Misc'} | $${ri.daily_rate || 0}/day | partner:"${ri.partner_name}"`)
        .slice(0, 80)
        .join('\n');

      // ── 4. Past show context ─────────────────────────────────────────────────
      const showLines = shows
        .slice(0, 6)
        .map(s => `"${s.name}" | ${s.status} | rooms:${(s.sub_locations || []).map(r => r.name).join(', ') || 'none'}`)
        .join('\n');

      // ── 5. Crew roles context ────────────────────────────────────────────────
      const crewLines = crewRoles
        .map(r => `"${r.role_name}" | ${r.department} | $${r.daily_rate_billable || r.hourly_rate_billable || 400}/day`)
        .join('\n');

      const hasOwnedInventory = availableAssets.length > 0;
      const hasRoundtablePartners = activePartners.length > 0;
      const hasRoundtableItems = availableRoundtableItems.length > 0;
      const hasCrew = crewLines.length > 0;

      // ── 6. Build calibration fulfillment map ──────────────────────────────────
      // These are explicit human-verified mappings: "for scenario X, use these items"
      const activeCalibrations = (calibrations || []).filter(c => c.is_active !== false && (c.preferred_items || []).length > 0);
      const calibrationBlock = activeCalibrations.length > 0
        ? activeCalibrations.map(c => {
            const preferred = (c.preferred_items || []).map(i => `"${i.asset_name}"`).join(', ');
            const alternates = (c.alternate_items || []).map(i => `"${i.asset_name}"`).join(', ');
            const rtNote = c.roundtable_note ? `roundtable_fallback:"${c.roundtable_note}"` : '';
            const notes = c.notes ? `notes:"${c.notes}"` : '';
            return [
              `SCENARIO: ${c.scenario_label} [${c.quality_level}]`,
              `  preferred_owned: ${preferred || 'none'}`,
              alternates ? `  alternates: ${alternates}` : '',
              rtNote ? `  ${rtNote}` : '',
              notes ? `  ${notes}` : '',
            ].filter(Boolean).join('\n');
          }).join('\n\n')
        : 'NO CALIBRATION DATA — use best judgment from inventory list above.';

      // ── 7. Build the prompt ──────────────────────────────────────────────────
      const prompt = `You are a senior AV production planner building a PRACTICAL show plan.
Your job is to assemble the BEST SHOW POSSIBLE using what is actually available, in this strict priority order:

PRIORITY ORDER (NEVER SKIP A LEVEL):
1. CALIBRATED FULFILLMENT MAP FIRST — check the calibration scenarios below. If a scenario matches a need, use EXACTLY those named owned items (in preference order). This is the highest-confidence source.
2. OWNED INVENTORY SECOND — for any need NOT covered by a calibration scenario, scan the full inventory list and substitute intelligently from owned gear.
3. ROUNDTABLE PARTNERS THIRD — if owned inventory cannot fill a need, check Roundtable partners. A Roundtable partner can fulfill ANY reasonable AV request even if the exact item is not listed.
4. SUGGESTED / MISSING ONLY LAST — only mark an item as truly missing (source:"missing") if it cannot be sourced from owned inventory OR any Roundtable partner.

CRITICAL: Do NOT label an item as missing just because you don't see it in owned inventory. If a Roundtable partner exists and could logically provide the item, it is a "roundtable" source, not missing.
CRITICAL: When a calibration scenario matches, use EXACTLY the listed preferred items by name — do not invent alternatives.

=== SHOW REQUIREMENTS ===
Type: ${inputs.show_type}
Audience: ${inputs.audience_size} people
Venue: ${inputs.venue_type || 'Unknown'} (${inputs.indoor_outdoor})
Rooms: ${inputs.room_count}
Budget: $${inputs.budget_target || 'Open'}
Quality: ${inputs.quality_level}
Audio: ${inputs.audio_needs} | Video: ${inputs.video_needs} | Lighting: ${inputs.lighting_needs}
Streaming/Recording: ${inputs.streaming_needs}
Complexity: ${inputs.complexity}
Service Level: ${inputs.service_level}
Show Days: ${inputs.show_days || 1}
${inputs.has_led_wall ? `LED Wall: ${inputs.has_led_wall}` : ''}
${inputs.display_count ? `Displays/Monitors needed: ${inputs.display_count}` : ''}
${inputs.display_size ? `Display size preference: ${inputs.display_size}` : ''}
${inputs.confidence_monitor ? `Confidence monitor/teleprompter: ${inputs.confidence_monitor}` : ''}
${inputs.presenter_count ? `Number of presenters/speakers: ${inputs.presenter_count}` : ''}
${inputs.mic_types ? `Mic types needed: ${inputs.mic_types}` : ''}
${inputs.pa_need ? `PA/Sound reinforcement need: ${inputs.pa_need}` : ''}
${inputs.audience_coverage ? `Audience coverage need: ${inputs.audience_coverage}` : ''}
${inputs.stage_lighting ? `Stage lighting: ${inputs.stage_lighting}` : ''}
${inputs.moving_lights ? `Moving lights: ${inputs.moving_lights}` : ''}
${inputs.room_setup_type ? `Room setup: ${inputs.room_setup_type}` : ''}
${inputs.crew_needs ? `Crew support detail: ${inputs.crew_needs}` : ''}
Additional Notes: ${inputs.notes || 'none'}

=== OWNED INVENTORY (${availableAssets.length} available items) ===
${hasOwnedInventory ? inventoryLines : 'NO OWNED INVENTORY — all equipment must come from Roundtable or be marked suggested.'}

=== OWNED KITS (available) ===
${kitLines || 'NONE'}

=== ROUNDTABLE PARTNERS (${activePartners.length} active — can fulfill ANY reasonable request) ===
${hasRoundtablePartners ? partnerLines : 'NO ROUNDTABLE PARTNERS'}

=== ROUNDTABLE PARTNER LISTED INVENTORY ===
${hasRoundtableItems ? roundtableItemLines : 'NONE listed — but partners above can still fulfill general requests'}

=== PAST SHOWS ===
${showLines || 'NONE'}

=== CREW ROLES ON FILE ===
${hasCrew ? crewLines : 'NONE — use standard AV crew titles'}

=== FULFILLMENT CALIBRATION MAP (human-verified preferred inventory choices) ===
INSTRUCTIONS: For each production need, check if a matching scenario exists below.
If it does, use the preferred_owned items listed — these are the exact items this company would pull.
Only deviate if those items are not in the owned inventory list (then use alternates, then roundtable).

${calibrationBlock}

=== BUILD RULES ===
1. Rooms array MUST have exactly ${inputs.room_count} room(s). NEVER return empty rooms.
2. Each room MUST have at least 2 equipment items.
3. For each equipment item, pick the SOURCE in this order:
   a. If a closely matching item exists in owned inventory → source:"owned", asset_name must match the owned item name exactly
   b. If not owned but a Roundtable partner could provide it → source:"roundtable", pick a specific partner_name from the partner list
   c. Only if truly not available from owned or Roundtable → source:"missing"
4. SUBSTITUTION IS GOOD: if owned inventory has a comparable item (e.g., similar mixer, display, mic) use it even if it's not the exact model. Note the substitution in the reason field.
5. Set not_in_inventory:false when source is "owned". Set not_in_inventory:true when source is "roundtable" or "missing".
6. The optional_missing array is ONLY for items that could NOT be sourced from owned inventory OR Roundtable — these are true gaps.
7. Roundtable items go in the rooms equipment array with source:"roundtable" — NOT in optional_missing.
8. Crew: return crew if service_level is "full_service" or "partial".
9. Produce valid JSON only — no markdown fences, no extra commentary.
10. inventory_coverage should be: "high" if >70% owned, "medium" if 30-70%, "low" if <30% owned.

Return ONLY this JSON (no other text):
{
  "show_name": "${inputs.show_name || (inputs.show_type + ' Draft')}",
  "summary": "one paragraph summary of how the show was built — mention owned gear used, roundtable sources, and any true gaps",
  "based_on_show": null,
  "quality_level": "${inputs.quality_level}",
  "inventory_coverage": "high|medium|low",
  "rooms": [
    {
      "name": "Room Name",
      "type": "stage|room|area|truck",
      "purpose": "What happens here",
      "equipment": [
        {
          "asset_id": null,
          "name": "Equipment Name (use exact owned inventory name if source=owned)",
          "category": "Audio|Video|Lighting|Other",
          "quantity": 1,
          "daily_rate": 0,
          "days": ${inputs.show_days || 1},
          "source": "owned|roundtable|missing",
          "not_in_inventory": false,
          "partner_name": null,
          "reason": "why needed + substitution notes if applicable"
        }
      ],
      "kits": []
    }
  ],
  "crew": [
    {
      "role_name": "Role",
      "department": "Audio|Video|Lighting|Production",
      "quantity": 1,
      "days": ${inputs.show_days || 1},
      "daily_rate_billable": 0,
      "rooms": ["Room Name"],
      "reason": "why needed"
    }
  ],
  "optional_missing": [
    {
      "name": "Item Name",
      "category": "Audio|Video|Lighting|Other",
      "quantity": 1,
      "daily_rate": 0,
      "reason": "why it is a true gap — confirm owned inventory AND Roundtable cannot fulfill this",
      "source_type": "missing",
      "estimated_subrent_cost": 0
    }
  ],
  "costing": {
    "days": ${inputs.show_days || 1},
    "owned_equipment_subtotal": 0,
    "roundtable_subtotal": 0,
    "equipment_subtotal": 0,
    "crew_subtotal": 0,
    "rough_total": 0,
    "rough_billable": 0,
    "over_budget": false,
    "budget_note": "Budget alignment note"
  }
}`;

      // ── 7. Call LLM ──────────────────────────────────────────────────────────
      let result = null;
      try {
        result = await db.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              show_name: { type: 'string' },
              summary: { type: 'string' },
              based_on_show: { type: 'string' },
              quality_level: { type: 'string' },
              inventory_coverage: { type: 'string' },
              rooms: { type: 'array', items: { type: 'object' } },
              crew: { type: 'array', items: { type: 'object' } },
              optional_missing: { type: 'array', items: { type: 'object' } },
              costing: { type: 'object' },
            },
            required: ['rooms', 'crew'],
          },
          model: 'claude_sonnet_4_6',
        });
      } catch (llmErr) {
        console.warn('[SmartBuild] LLM failed, using fallback:', llmErr.message);
        result = null;
      }

      // ── 8. Post-process: match owned inventory to real asset IDs ─────────────
      if (result?.rooms) {
        result.rooms = result.rooms.map(room => ({
          ...room,
          equipment: (room.equipment || []).map(eq => {
            if (eq.source === 'owned') {
              // Try to find the actual asset record so we can link asset_id
              const match = availableAssets.find(a =>
                a.name.toLowerCase() === eq.name.toLowerCase() ||
                a.name.toLowerCase().includes(eq.name.toLowerCase().slice(0, 15)) ||
                eq.name.toLowerCase().includes(a.name.toLowerCase().slice(0, 15))
              );
              if (match) {
                return {
                  ...eq,
                  asset_id: match.id,
                  daily_rate: eq.daily_rate || match.daily_rate || 0,
                  not_in_inventory: false,
                };
              }
              // LLM said owned but we can't match — keep as-is, still mark not_in_inventory false
              return { ...eq, not_in_inventory: false };
            }
            if (eq.source === 'roundtable') {
              return { ...eq, not_in_inventory: true };
            }
            // missing
            return { ...eq, not_in_inventory: true };
          }),
        }));
      }

      // ── 9. Validate & fallback ───────────────────────────────────────────────
      const llmHasContent = result?.rooms?.length > 0 && result.rooms.some(r => (r.equipment?.length || 0) > 0);

      if (!llmHasContent) {
        setUsedFallback(true);
        result = buildFallbackDraft(inputs);
      } else {
        // Inject crew if missing
        if ((!result.crew || result.crew.length === 0) && inputs.service_level !== 'dry_hire') {
          const fallback = buildFallbackDraft(inputs);
          result.crew = fallback.crew;
        }

        // Fix costing if blank
        if (!result.costing?.rough_total) {
          const ownedTotal = (result.rooms || []).flatMap(r => r.equipment || [])
            .filter(e => e.source === 'owned')
            .reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
          const roundtableTotal = (result.rooms || []).flatMap(r => r.equipment || [])
            .filter(e => e.source === 'roundtable')
            .reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
          const otherEquip = (result.rooms || []).flatMap(r => r.equipment || [])
            .filter(e => !e.source || e.source === 'missing')
            .reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
          const crewTotal = (result.crew || [])
            .reduce((s, c) => s + (c.daily_rate_billable || 0) * (c.quantity || 1) * (c.days || 1), 0);
          const equipTotal = ownedTotal + roundtableTotal + otherEquip;
          const total = equipTotal + crewTotal;
          result.costing = {
            days: inputs.show_days || 1,
            owned_equipment_subtotal: ownedTotal,
            roundtable_subtotal: roundtableTotal,
            equipment_subtotal: equipTotal,
            crew_subtotal: crewTotal,
            rough_total: total,
            rough_billable: Math.round(total * 1.4),
            over_budget: Number(inputs.budget_target || 0) > 0 && total > Number(inputs.budget_target),
            budget_note: 'Cost estimate calculated from recommended items.',
          };
        }

        // Compute inventory_coverage if not set
        if (!result.inventory_coverage) {
          const allEquip = (result.rooms || []).flatMap(r => r.equipment || []);
          const ownedCount = allEquip.filter(e => e.source === 'owned' || !e.not_in_inventory).length;
          const pct = allEquip.length > 0 ? ownedCount / allEquip.length : 0;
          result.inventory_coverage = pct >= 0.7 ? 'high' : pct >= 0.3 ? 'medium' : 'low';
        }
      }

      return result;
    } catch (err) {
      console.error('[SmartBuild] fatal error:', err);
      setUsedFallback(true);
      return buildFallbackDraft(inputs);
    } finally {
      setBuilding(false);
    }
  };

  return { generate, building, error, usedFallback };
}