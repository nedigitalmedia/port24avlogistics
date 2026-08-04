import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet, CheckCircle2, ChevronRight, Trash2, BookOpen,
  AlertCircle, AlertTriangle, Clock, Download, Package, Cloud, PackageOpen, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import { IMPORT_FIELDS, detectFieldWithConfidence } from '@/lib/equipmentFields';
import MappingStep from '@/components/import/MappingStep';
import ItemTypeSelector, { TYPES } from '@/components/import/ItemTypeSelector';

// ── Step list ────────────────────────────────────────────────────────────────
const STEPS_LIST = ['type', 'upload', 'map', 'preview', 'importing', 'done'];
const STEP_LABELS = {
  type: 'Item Type',
  upload: 'Upload',
  map: 'Map Columns',
  preview: 'Preview',
  importing: 'Importing',
  done: 'Done',
};

const makeSessionId = () => `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ── Download type-specific template ──────────────────────────────────────────
const downloadTemplate = (itemType) => {
  const typeDef = TYPES.find(t => t.key === itemType) || TYPES[0];
  const wb = XLSX.utils.book_new();

  if (itemType === 'serialized_kit') {
    // Sheet 1: Kit list with contents columns
    const kitCols = ['Name', 'QR Code / RFID', 'Category', 'Daily Rate', 'Storage Location', 'Asset Numbers (Serial #s)', 'Asset Names', 'Notes'];
    const kitExample1 = ['Audio Kit - Stage Left', 'KIT-001', 'Audio', '250', 'Flight Case 3', 'SN123, SN124, SN125', 'SM58 Mic, SM58 Mic, XLR Cable', 'Main stage audio kit'];
    const kitExample2 = ['Video Kit - Main', 'KIT-002', 'Video', '400', 'Rolling Case 1', 'SN200, SN201', 'PTZ Camera, PTZ Camera', 'Primary video package'];
    const wsKits = XLSX.utils.aoa_to_sheet([kitCols, kitExample1, kitExample2]);
    wsKits['!cols'] = kitCols.map((h, i) => ({ wch: i === 5 || i === 6 ? 35 : 24 }));
    XLSX.utils.book_append_sheet(wb, wsKits, 'Serialized Kits');

    // Sheet 2: Instructions
    const instructions = [
      ['Serialized Kit Import — Instructions'],
      [''],
      ['COLUMN', 'REQUIRED?', 'DESCRIPTION'],
      ['Name', 'YES', 'The kit name (e.g. "Audio Kit - Stage Left")'],
      ['QR Code / RFID', 'No', 'The kit\'s own barcode or QR code label (e.g. KIT-001)'],
      ['Category', 'No', 'Department category (e.g. Audio, Video, Lighting)'],
      ['Daily Rate', 'No', 'Rental price per day for the whole kit'],
      ['Storage Location', 'No', 'Where the physical case lives (e.g. "Flight Case 3")'],
      ['Asset Numbers (Serial #s)', 'No', 'Comma-separated serial numbers of assets inside this kit (e.g. SN123, SN124, SN125)'],
      ['Asset Names', 'No', 'Comma-separated asset names matching the serial numbers above'],
      ['Notes', 'No', 'Any additional notes about this kit'],
      [''],
      ['TIPS'],
      ['• One row = one Serialized Kit'],
      ['• List ALL serial numbers/asset names for items inside the kit in the same row, separated by commas'],
      ['• Asset Numbers and Asset Names columns are reference info — used to populate kit contents after import'],
      ['• The system will try to match Asset Numbers against existing inventory serials automatically'],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    wsInstructions['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
  } else {
    // Standard single-sheet template for other types
    const ws = XLSX.utils.aoa_to_sheet([typeDef.templateCols, typeDef.templateExample]);
    ws['!cols'] = typeDef.templateCols.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, typeDef.label);
  }

  XLSX.writeFile(wb, `${typeDef.label.toLowerCase().replace(/ /g, '_')}_import_template.xlsx`);
};

// ── Download error summary ────────────────────────────────────────────────────
const downloadErrors = (stagedRows) => {
  const errorRows = stagedRows.filter(r => r.importAction === 'error');
  if (!errorRows.length) return;
  const rows = [
    ['Row #', 'Name', 'Errors'],
    ...errorRows.map(r => [r.row_index + 1, r.mappedData.name || '(no name)', r.validationErrors.join('; ')]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
  XLSX.writeFile(wb, 'import_errors.xlsx');
};

export default function ImportInventory() {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('type');
  const [itemType, setItemType] = useState(null); // 'physical' | 'cloud_kit' | 'serialized_kit'
  const [extractedData, setExtractedData] = useState(null);
  const [fieldMap, setFieldMap] = useState({});
  const [confidenceMap, setConfidenceMap] = useState({});
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [dupeMatchBy, setDupeMatchBy] = useState('barcode');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  const [stagedRows, setStagedRows] = useState([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const queryClient = useQueryClient();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => db.entities.Asset.list('-created_date', 5000),
  });
  const { data: kits = [] } = useQuery({
    queryKey: ['kits'],
    queryFn: () => db.entities.Kit.list('-created_date', 2000),
  });
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => db.entities.CustomField.filter({ entity_type: 'asset' }),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['importTemplates'],
    queryFn: () => db.entities.ImportTemplate.list('-created_date', 50),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => db.entities.ImportTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importTemplates'] });
      setSaveTemplateOpen(false);
      setNewTemplateName('');
    },
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => db.entities.ImportTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['importTemplates'] }),
  });

  // ── Fields available in the mapper ───────────────────────────────────────
  // Cloud Kits and Serialized Kits use a reduced field set (Kit entity)
  const KIT_FIELDS = [
    { key: 'name',              label: 'Name',                        required: true  },
    { key: 'barcode',           label: 'QR Code / RFID',              required: false },
    { key: 'category',          label: 'Category',                    required: false },
    { key: 'daily_rate',        label: 'Daily Rate',                  required: false },
    { key: 'location',          label: 'Storage Location',            required: false },
    { key: 'asset_serials',     label: 'Asset Numbers (Serial #s)',   required: false },
    { key: 'asset_names',       label: 'Asset Names',                 required: false },
    { key: 'notes',             label: 'Notes',                       required: false },
    { key: '_skip',             label: '— Skip this column —',        required: false },
  ];

  const PHYSICAL_FIELDS = [
    ...IMPORT_FIELDS.filter(f => f.key !== '_skip'),
    ...customFields.filter(cf => !cf.is_hidden).map(cf => ({
      key: `cf_${cf.field_key}`,
      label: `[Custom] ${cf.field_name}`,
      required: cf.is_required,
    })),
    { key: '_skip', label: '— Skip this column —', required: false },
  ];

  const allMappableFields = (itemType === 'cloud_kit' || itemType === 'serialized_kit')
    ? KIT_FIELDS
    : PHYSICAL_FIELDS;

  // ── Auto-detect headers ───────────────────────────────────────────────────
  const buildMapsFromHeaders = (headers) => {
    const fMap = {};
    const cMap = {};
    headers.forEach((h, i) => {
      const { key, confidence } = detectFieldWithConfidence(h, customFields);
      // Only map to fields that are valid for this item type
      const validKey = allMappableFields.some(f => f.key === key) ? key : '_skip';
      fMap[String(i)] = (confidence === 'high' || confidence === 'medium') ? validKey : '_skip';
      cMap[String(i)] = confidence;
    });
    return { fMap, cMap };
  };

  // ── Build mapped record from row ──────────────────────────────────────────
  const buildMappedRecord = (row, fMap, headers) => {
    const rec = {};
    Object.entries(fMap).forEach(([colIdx, fieldKey]) => {
      if (fieldKey === '_skip') return;
      const idx = Number(colIdx);
      let val = (row[idx] ?? '').toString().trim();
      if (!val && headers) {
        const headerName = headers[idx];
        if (headerName) {
          const altIdx = headers.indexOf(headerName);
          if (altIdx !== -1) val = (row[altIdx] ?? '').toString().trim();
        }
      }
      if (!val) return;
      if (fieldKey.startsWith('cf_')) {
        if (!rec.custom_fields) rec.custom_fields = {};
        rec.custom_fields[fieldKey.replace('cf_', '')] = val;
      } else {
        rec[fieldKey] = val;
      }
    });
    return rec;
  };

  // ── Validate by type ──────────────────────────────────────────────────────
  const validateRecord = (mapped) => {
    const errors = [];
    if (!mapped.name?.trim()) errors.push('Missing required field: Name');

    if (itemType === 'physical') {
      // Warn if name looks like a type label (caught bad imports early)
      const typeLabelWords = ['physical item', 'cloud kit', 'serialized kit', 'virtual combination', 'physical combination'];
      if (typeLabelWords.includes((mapped.name || '').toLowerCase())) {
        errors.push(`"${mapped.name}" looks like a type label, not an item name`);
      }
      // Category must not be a type label
      const catTypeLabelWords = ['physical item', 'kit', 'cloud kit', 'serialized kit'];
      if (mapped.category && catTypeLabelWords.includes(mapped.category.toLowerCase())) {
        errors.push(`Category "${mapped.category}" looks like a type label — use a real category like "Audio", "Video", "Lighting"`);
      }
    }

    if (itemType === 'cloud_kit' || itemType === 'serialized_kit') {
      if (mapped.serial_numbers) {
        errors.push('Kits do not use serial numbers — remove that column or use QR Code instead');
      }
    }

    return errors;
  };

  // ── Duplicate detection ───────────────────────────────────────────────────
  const findExisting = (mapped, matchBy) => {
    const matchVal = (mapped[matchBy] || '').toLowerCase().trim();
    if (!matchVal) return null;

    if (itemType === 'cloud_kit' || itemType === 'serialized_kit') {
      // Match against Kit entity
      const kitMatchBy = matchBy === 'serial_numbers' ? 'barcode' : matchBy;
      return kits.find(k => (k[kitMatchBy] || '').toLowerCase() === matchVal) || null;
    }
    // Physical item — match against Asset entity
    return assets.find(a => (a[matchBy] || '').toLowerCase() === matchVal) || null;
  };

  // ── File parsing ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError(null);
    setIsUploading(true);

    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (!raw || raw.length < 2) {
        setUploadError('The file appears to be empty or has only one row.');
        return;
      }

      const rawHeaderRow = raw[0] || [];
      const maxCols = Math.max(...raw.map(r => r.length));
      const headerRow = [];
      for (let i = 0; i < maxCols; i++) {
        headerRow.push(String(rawHeaderRow[i] ?? '').trim());
      }
      const validColIndices = headerRow.reduce((acc, h, i) => { if (h) acc.push(i); return acc; }, []);
      const headers = validColIndices.map(i => headerRow[i]);

      if (headers.length === 0) {
        setUploadError('No column headers found. Make sure row 1 of your spreadsheet contains column names.');
        return;
      }

      const rows = raw.slice(1)
        .map(r => validColIndices.map(i => String(r[i] ?? '').trim()))
        .filter(r => r.some(cell => cell !== ''));

      setExtractedData({ headers, rows });

      // Check saved template match
      const matchedTemplate = templates.find(t => {
        const th = t.column_headers || [];
        return th.length === headers.length && th.every((h, i) => h === headers[i]);
      });

      if (matchedTemplate) {
        setFieldMap(matchedTemplate.field_map || {});
        setConfidenceMap({});
        setDuplicateAction(matchedTemplate.duplicate_action || 'skip');
        setDupeMatchBy(matchedTemplate.dupe_match_by || 'barcode');
      } else {
        const { fMap, cMap } = buildMapsFromHeaders(headers);
        setFieldMap(fMap);
        setConfidenceMap(cMap);
      }
      setStep('map');
    } catch {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadError('Could not read the file. Please check it is a valid .csv or .xlsx.');
    }
  };

  const autoMapAll = () => {
    const headers = extractedData?.headers || [];
    const { fMap, cMap } = buildMapsFromHeaders(headers);
    headers.forEach((h, i) => {
      if (cMap[String(i)] === 'low') {
        const { key } = detectFieldWithConfidence(h, customFields);
        if (key !== '_skip' && allMappableFields.some(f => f.key === key)) {
          fMap[String(i)] = key;
        }
      }
    });
    setFieldMap(fMap);
    setConfidenceMap(cMap);
  };

  const applyTemplate = (template) => {
    setFieldMap(template.field_map || {});
    setConfidenceMap({});
    setDuplicateAction(template.duplicate_action || 'skip');
    setDupeMatchBy(template.dupe_match_by || 'barcode');
  };

  // ── Staging / validation ──────────────────────────────────────────────────
  const runStaging = async () => {
    setIsStaging(true);
    const allRows = extractedData?.rows || [];
    const headers = extractedData?.headers || [];
    const enriched = [];

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const hasAnyData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (!hasAnyData) continue;

      const rawData = {};
      headers.forEach((h, j) => { rawData[h] = row[j] ?? ''; });

      const mappedData = buildMappedRecord(row, fieldMap, headers);
      const validationErrors = validateRecord(mappedData);
      const isValid = validationErrors.length === 0;

      const existing = findExisting(mappedData, dupeMatchBy);
      let duplicateStatus = 'none';
      let duplicateId = null;
      let importAction = 'create';

      if (existing) {
        duplicateId = existing.id;
        if (duplicateAction === 'skip') { duplicateStatus = 'duplicate'; importAction = 'skip'; }
        else if (duplicateAction === 'update') { duplicateStatus = 'duplicate'; importAction = 'update'; }
        else if (duplicateAction === 'flag_review') { duplicateStatus = 'flagged'; importAction = 'flag_review'; }
        else { duplicateStatus = 'duplicate'; importAction = 'create'; }
      }

      if (!isValid) importAction = 'error';

      enriched.push({
        row_index: i,
        rawData,
        mappedData,
        validationErrors,
        duplicateStatus,
        duplicateId,
        importAction,
        isValid,
        existingRecord: existing || null,
      });
    }

    setStagedRows(enriched);
    setIsStaging(false);
    setStep('preview');
  };

  // ── Final import ──────────────────────────────────────────────────────────
  const runImport = async () => {
    setStep('importing');
    let success = 0, updated = 0, skipped = 0, flagged = 0, failed = 0;
    const errors = [];
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    const apiCall = async (fn, retries = 4) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try { return await fn(); }
        catch (err) {
          if (err?.message?.includes('Rate limit') && attempt < retries) {
            await sleep(1500 * (attempt + 1));
          } else { throw err; }
        }
      }
    };

    for (let i = 0; i < stagedRows.length; i++) {
      const staged = stagedRows[i];
      setProgress(Math.round(((i + 1) / stagedRows.length) * 100));
      setProgressLabel(`Row ${i + 1} of ${stagedRows.length}`);

      if (staged.importAction === 'error') {
        failed++;
        staged.validationErrors.forEach(e => errors.push(`Row ${staged.row_index + 1}: ${e}`));
        continue;
      }
      if (staged.importAction === 'skip') { skipped++; continue; }
      if (staged.importAction === 'flag_review') { flagged++; continue; }

      try {

      // ── Kit import (Cloud Kit or Serialized Kit) ──────────────────────────
      if (itemType === 'cloud_kit' || itemType === 'serialized_kit') {
        const kitRec = {
          name: staged.mappedData.name,
          kit_type: itemType === 'cloud_kit' ? 'cloud' : 'serialized',
          status: 'available',
          category: staged.mappedData.category || '',
          notes: staged.mappedData.notes || '',
          location: staged.mappedData.location || '',
        };
        if (staged.mappedData.barcode) kitRec.barcode = staged.mappedData.barcode;
        if (staged.mappedData.daily_rate) {
          const n = Number(String(staged.mappedData.daily_rate).replace(/[^0-9.-]/g, ''));
          if (!isNaN(n)) kitRec.daily_rate = n;
        }
        // Store asset contents reference for serialized kits
        if (itemType === 'serialized_kit') {
          if (staged.mappedData.asset_serials) kitRec.asset_serials = staged.mappedData.asset_serials;
          if (staged.mappedData.asset_names) kitRec.asset_names = staged.mappedData.asset_names;
        }

        if (staged.importAction === 'update' && staged.duplicateId) {
          await apiCall(() => db.entities.Kit.update(staged.duplicateId, kitRec));
          updated++;
        } else {
          await apiCall(() => db.entities.Kit.create(kitRec));
          success++;
        }
        await sleep(200);
        continue;
      }

      // ── Physical Item import ──────────────────────────────────────────────
      const rawRec = {
        status: 'available',
        condition: 'good',
        tracking: 'serialized',
        ...staged.mappedData,
      };

      // Sanitize numerics
      ['purchase_price', 'daily_rate', 'subrent_cost', 'quantity'].forEach(k => {
        if (rawRec[k] !== undefined && rawRec[k] !== '') {
          const n = Number(String(rawRec[k]).replace(/[^0-9.-]/g, ''));
          if (!isNaN(n)) rawRec[k] = n;
          else delete rawRec[k];
        }
      });

      // Expand multi-serial rows into individual assets
      const serialsStr = (rawRec.serial_numbers || '').trim();
      if (serialsStr) {
        const serials = serialsStr.split(',').map(s => s.trim()).filter(Boolean);

        if (serials.length > 1) {
          const { serial_numbers, quantity, ...baseRec } = rawRec;
          baseRec.tracking = 'serialized';
          baseRec.quantity = 1;

          for (const [serialIdx, serial] of serials.entries()) {
            const assetRec = { ...baseRec, serial_number: serial };
            // barcode/asset_number are UNIQUE columns — the sheet only gives one code per
            // row, so only the first expanded unit can keep it; the rest get assigned later
            // via the Assign Barcodes page.
            if (serialIdx > 0) { delete assetRec.barcode; delete assetRec.asset_number; }
            if (staged.importAction === 'update' && staged.duplicateId && serial === serials[0]) {
              await apiCall(() => db.entities.Asset.update(staged.duplicateId, assetRec));
              updated++;
            } else {
              await apiCall(() => db.entities.Asset.create(assetRec));
              success++;
            }
            await sleep(100);
          }
        } else {
          rawRec.serial_number = serials[0];
          delete rawRec.serial_numbers;
          rawRec.tracking = 'serialized';
          rawRec.quantity = 1;
          if (staged.importAction === 'update' && staged.duplicateId) {
            await apiCall(() => db.entities.Asset.update(staged.duplicateId, rawRec));
            updated++;
          } else {
            await apiCall(() => db.entities.Asset.create(rawRec));
            success++;
          }
        }
      } else {
        delete rawRec.serial_numbers;
        if (staged.importAction === 'update' && staged.duplicateId) {
          await apiCall(() => db.entities.Asset.update(staged.duplicateId, rawRec));
          updated++;
        } else {
          await apiCall(() => db.entities.Asset.create(rawRec));
          success++;
        }
      }

      } catch (err) {
        failed++;
        errors.push(`Row ${staged.row_index + 1}: ${err?.message || 'Import failed'}`);
      }

      await sleep(200);
    }

    setImportResult({ total: stagedRows.length, success, updated, skipped, flagged, failed, errors });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['kits'] });
    setStep('done');
  };

  const reset = () => {
    setStep('type'); setItemType(null); setExtractedData(null);
    setFieldMap({}); setConfidenceMap({}); setImportResult(null);
    setProgress(0); setProgressLabel(''); setStagedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const allRows = extractedData?.rows || [];
  const stepIndex = STEPS_LIST.indexOf(step);

  const stageSummary = {
    valid: stagedRows.filter(r => r.isValid && r.importAction !== 'skip' && r.importAction !== 'flag_review').length,
    errors: stagedRows.filter(r => r.importAction === 'error').length,
    duplicates: stagedRows.filter(r => r.duplicateStatus === 'duplicate').length,
    flagged: stagedRows.filter(r => r.importAction === 'flag_review').length,
  };

  const typeDef = TYPES.find(t => t.key === itemType);
  const TypeIcon = typeDef ? { physical: Package, cloud_kit: Cloud, serialized_kit: PackageOpen }[itemType] : null;

  return (
    <div>
      <PageHeader title="Import Inventory" description="Guided bulk import for Physical Items, Cloud Kits, and Serialized Kits" />

      {/* ── Step indicator ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-8 text-sm flex-wrap">
        {STEPS_LIST.map((s, i) => [
          <div key={s} className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded',
            step === s ? 'text-primary font-semibold' : stepIndex > i ? 'text-muted-foreground' : 'text-muted-foreground/40'
          )}>
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
              step === s ? 'bg-primary text-primary-foreground' : stepIndex > i ? 'bg-emerald-500 text-white' : 'bg-muted'
            )}>{i + 1}</span>
            <span className="capitalize hidden sm:inline">{STEP_LABELS[s]}</span>
          </div>,
          i < STEPS_LIST.length - 1 && <ChevronRight key={`arr-${i}`} className="w-3 h-3 text-muted-foreground/30 shrink-0" />
        ])}
      </div>

      {/* ── STEP 1: Choose Item Type ──────────────────────────────────────── */}
      {step === 'type' && (
        <div className="max-w-2xl space-y-6">
          <ItemTypeSelector selected={itemType} onSelect={setItemType} />
          <Button
            disabled={!itemType}
            onClick={() => setStep('upload')}
            className="gap-2"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── STEP 2: Upload ───────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="max-w-2xl space-y-4">
          {/* Selected type pill */}
          {typeDef && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border text-sm">
              {TypeIcon && <TypeIcon className="w-4 h-4 text-muted-foreground" />}
              <span className="font-medium">Importing:</span>
              <span className="text-muted-foreground">{typeDef.label}</span>
              <button
                onClick={() => setStep('type')}
                className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
              >
                Change <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              <div
                className={cn(
                  'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors',
                  isUploading ? 'border-primary/40 bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30'
                )}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" /><p className="font-medium">Reading file...</p></>
                ) : (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="font-semibold">Drop your spreadsheet here</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports .csv, .xlsx, .xls — columns auto-detected</p>
                    <Button variant="outline" size="sm" className="mt-4" type="button"
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Browse Files
                    </Button>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-700">Download Template for {typeDef?.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pre-formatted Excel file with the right columns for {typeDef?.label}s — fill it in and upload.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => downloadTemplate(itemType)}>
                  <Download className="w-3.5 h-3.5" /> Download .xlsx
                </Button>
              </div>

              {typeDef && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Expected columns for {typeDef.label}:</p>
                  <p className="leading-relaxed">{typeDef.templateCols.join(' · ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved templates */}
          {templates.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Saved Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Templates auto-apply when you upload a file with matching columns.</p>
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{(t.column_headers || []).length} columns · {t.duplicate_action}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteTemplateMutation.mutate(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => setStep('type')}>← Back</Button>
        </div>
      )}

      {/* ── STEP 3: Map columns ──────────────────────────────────────────── */}
      {step === 'map' && extractedData && (
        <div className="space-y-4">
          {/* Type badge reminder */}
          {typeDef && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {TypeIcon && <TypeIcon className="w-3.5 h-3.5" />}
              Importing as <strong>{typeDef.label}</strong>
              {itemType === 'cloud_kit' && <Badge variant="outline" className="text-xs">Kit entity · Cloud type</Badge>}
              {itemType === 'serialized_kit' && <Badge variant="outline" className="text-xs">Kit entity · Serialized type</Badge>}
              {itemType === 'physical' && <Badge variant="outline" className="text-xs">Asset entity</Badge>}
            </div>
          )}
          <MappingStep
            extractedData={extractedData}
            fieldMap={fieldMap}
            setFieldMap={setFieldMap}
            confidenceMap={confidenceMap}
            duplicateAction={duplicateAction}
            setDuplicateAction={setDuplicateAction}
            dupeMatchBy={dupeMatchBy}
            setDupeMatchBy={setDupeMatchBy}
            allMappableFields={allMappableFields}
            templates={templates}
            rowCount={allRows.length}
            onAutoMap={autoMapAll}
            onApplyTemplate={applyTemplate}
            onSaveTemplate={() => setSaveTemplateOpen(true)}
            onNext={runStaging}
            nextLabel={isStaging ? 'Analysing rows...' : 'Analyse & Preview →'}
            nextDisabled={isStaging}
          />
          {isStaging && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-3xl">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              Staging rows and checking for duplicates...
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: Preview ──────────────────────────────────────────────── */}
      {step === 'preview' && stagedRows.length > 0 && (
        <div className="space-y-4 max-w-5xl">
          {/* Summary pills */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {stageSummary.valid} ready to import
            </div>
            {stageSummary.errors > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {stageSummary.errors} errors
              </div>
            )}
            {stageSummary.duplicates > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 rounded-full text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> {stageSummary.duplicates} duplicates
              </div>
            )}
            {stageSummary.flagged > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-700 rounded-full text-xs font-medium">
                <Clock className="w-3.5 h-3.5" /> {stageSummary.flagged} flagged for review
              </div>
            )}
            {typeDef && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground ml-auto">
                {TypeIcon && <TypeIcon className="w-3.5 h-3.5" />} {typeDef.label}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Row Preview</CardTitle>
                <Badge variant="outline">{stagedRows.length} total rows</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8">#</TableHead>
                      {Object.entries(fieldMap)
                        .filter(([, v]) => v !== '_skip')
                        .map(([i, fieldKey]) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">
                            {allMappableFields.find(f => f.key === fieldKey)?.label || fieldKey}
                          </TableHead>
                        ))}
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagedRows.slice(0, 20).map((staged, ri) => (
                      <TableRow key={ri} className={cn(
                        staged.importAction === 'error' ? 'bg-destructive/5' :
                        staged.importAction === 'skip' ? 'bg-muted/30 opacity-60' :
                        staged.importAction === 'flag_review' ? 'bg-blue-500/5' :
                        staged.importAction === 'update' ? 'bg-amber-500/5' : ''
                      )}>
                        <TableCell className="text-xs text-muted-foreground">{staged.row_index + 1}</TableCell>
                        {Object.entries(fieldMap)
                          .filter(([, v]) => v !== '_skip')
                          .map(([colIdx, fieldKey]) => (
                            <TableCell key={colIdx} className="text-xs max-w-[140px] truncate">
                              {staged.mappedData[fieldKey] || staged.rawData[extractedData.headers[parseInt(colIdx)]] || '—'}
                            </TableCell>
                          ))}
                        <TableCell>
                          {staged.importAction === 'create' && <Badge className="bg-emerald-500/10 text-emerald-700 text-xs border-0">create</Badge>}
                          {staged.importAction === 'update' && <Badge className="bg-amber-500/10 text-amber-700 text-xs border-0">update</Badge>}
                          {staged.importAction === 'skip' && <Badge className="bg-muted text-muted-foreground text-xs border-0">skip</Badge>}
                          {staged.importAction === 'flag_review' && <Badge className="bg-blue-500/10 text-blue-700 text-xs border-0">review</Badge>}
                          {staged.importAction === 'error' && <Badge className="bg-destructive/10 text-destructive text-xs border-0">error</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                          {staged.validationErrors.length > 0 ? staged.validationErrors[0] : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {stagedRows.length > 20 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 20 of {stagedRows.length} rows</p>
              )}

              {/* Error details + download */}
              {stageSummary.errors > 0 && (
                <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-destructive">Validation errors (these rows will be skipped):</p>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => downloadErrors(stagedRows)}>
                      <Download className="w-3 h-3" /> Download errors
                    </Button>
                  </div>
                  {stagedRows.filter(r => r.importAction === 'error').map((r, i) => (
                    <p key={i} className="text-xs text-destructive">Row {r.row_index + 1}: {r.validationErrors.join('; ')}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-4 flex-wrap gap-3">
                <Button variant="outline" onClick={() => setStep('map')}>← Back to Mapping</Button>
                <Button onClick={runImport} disabled={stageSummary.valid === 0 && stageSummary.errors === stagedRows.length}>
                  Import {stageSummary.valid} valid row{stageSummary.valid !== 1 ? 's' : ''} →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 5: Importing ────────────────────────────────────────────── */}
      {step === 'importing' && (
        <Card className="max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-semibold mb-3">Importing {typeDef?.label}s...</p>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">{progressLabel} · {progress}%</p>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 6: Done ─────────────────────────────────────────────────── */}
      {step === 'done' && importResult && (
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold">Import Complete</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {importResult.total} rows processed as {typeDef?.label}s
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Created',  value: importResult.success, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { label: 'Updated',  value: importResult.updated, color: 'text-blue-600',    bg: 'bg-blue-500/10' },
                { label: 'Skipped',  value: importResult.skipped, color: 'text-amber-600',   bg: 'bg-amber-500/10' },
                { label: 'Flagged',  value: importResult.flagged, color: 'text-violet-600',  bg: 'bg-violet-500/10' },
                { label: 'Errors',   value: importResult.failed,  color: 'text-red-600',     bg: 'bg-red-500/10' },
              ].filter(s => s.value > 0 || s.label === 'Created' || s.label === 'Updated').map(s => (
                <div key={s.label} className={cn('text-center p-3 rounded-lg', s.bg)}>
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-muted rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">{e}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Import More</Button>
              <Button className="flex-1" onClick={() => window.location.href = '/assets'}>View Inventory</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Save Template Dialog ─────────────────────────────────────────── */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save Import Template</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <Label className="mb-1.5 block">Template Name</Label>
              <Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="e.g. My Audio Rental Sheet" />
            </div>
            <p className="text-xs text-muted-foreground">
              Saves column mappings and duplicate rules. Auto-applied next time you upload a file with the same columns.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            <Button
              disabled={!newTemplateName.trim() || saveTemplateMutation.isPending}
              onClick={() => saveTemplateMutation.mutate({
                name: newTemplateName.trim(),
                column_headers: extractedData?.headers || [],
                field_map: fieldMap,
                duplicate_action: duplicateAction,
                dupe_match_by: dupeMatchBy,
              })}>
              {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}