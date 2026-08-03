import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, QrCode } from 'lucide-react';
import QRLabelPrinter from './QRLabelPrinter';
import { getSerialNumbersString } from '@/lib/serialNumbers';

import Step1ItemType from './wizard/Step1ItemType';
import Step2ProductDetails from './wizard/Step2ProductDetails';
import Step3Tracking from './wizard/Step3Tracking';
import Step4Pricing from './wizard/Step4Pricing';
import Step5Location from './wizard/Step5Location';
import Step6ExtraDetails from './wizard/Step6ExtraDetails';
import Step7Review from './wizard/Step7Review';

const STEPS = [
  { label: 'Item Type' },
  { label: 'Product' },
  { label: 'Tracking' },
  { label: 'Pricing' },
  { label: 'Location' },
  { label: 'Details' },
  { label: 'Review' },
];

const DEFAULT_FORM = {
  item_type: 'physical_item',
  name: '',
  asset_number: '',
  barcode: '',
  serial_number: '',
  category: '',
  manufacturer: '',
  model: '',
  description: '',
  image_url: '',
  tracking: 'serialized',
  added_serials: [],
  quantity: 1,
  reorder_level: '',
  daily_rate: '',
  replacement_value: '',
  purchase_price: '',
  subrent_cost: '',
  pricing_tier: 'retail',
  max_discount_pct: 50,
  taxable: true,
  discountable: true,
  status: 'available',
  condition: 'good',
  location: 'Warehouse',
  purchase_date: '',
  ownership_type: 'owned',
  partner_owner_id: '',
  partner_owner_name: '',
  partner_use_allowed: true,
  partner_approval_required: false,
  partner_agreement_notes: '',
  weight_kg: '',
  country_of_origin: '',
  vendor: '',
  warranty_expiry: '',
  notes: '',
  custom_fields: {},
  home_container_id: '',
  home_container_name: '',
  current_container_id: '',
  current_container_name: '',
  permanent_container: false,
  can_move_to_show_container: true,
  storage_notes: '',
};

const CORE_FIELDS = [
  'item_type', 'name', 'asset_number', 'barcode', 'category', 'status', 'condition',
  'location', 'notes', 'daily_rate', 'pricing_tier', 'max_discount_pct', 'purchase_date',
  'purchase_price', 'replacement_value', 'weight_kg', 'serial_numbers', 'tracking', 'quantity',
  'ownership_type', 'partner_owner_id', 'partner_owner_name', 'partner_use_allowed',
  'partner_approval_required', 'partner_agreement_notes', 'manufacturer', 'model', 'description',
  'image_url', 'subrent_cost', 'reorder_level', 'country_of_origin', 'vendor', 'warranty_expiry',
  'taxable', 'discountable', 'custom_fields',
  // Container assignment
  'home_container_id', 'home_container_name', 'current_container_id', 'current_container_name',
  'permanent_container', 'can_move_to_show_container', 'storage_notes',
];

export default function AssetFormDialog({ open, onOpenChange, asset }) {
  const isEditing = !!asset;
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [qrPrinterOpen, setQrPrinterOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => db.entities.Category.list() });
  const { data: partners = [] } = useQuery({ queryKey: ['roundtablePartners'], queryFn: () => db.entities.RoundtablePartner.filter({ is_active: true }) });
  const { data: customFields = [] } = useQuery({ queryKey: ['customFields'], queryFn: () => db.entities.CustomField.filter({ applies_to: 'asset' }) });
  const { data: allAssets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => db.entities.Asset.list('-created_date', 5000) });

  useEffect(() => {
    if (!open) return;
    setStep(isEditing ? 1 : 0);
    if (asset) {
      setFormData({
        ...DEFAULT_FORM,
        item_type: asset.item_type || 'physical_item',
        name: asset.name || '',
        asset_number: asset.asset_number || '',
        barcode: asset.barcode || '',
        serial_number: asset.serial_number || '',
        serial_numbers: getSerialNumbersString(asset),
        category: asset.category || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        description: asset.description || '',
        image_url: asset.image_url || '',
        tracking: asset.tracking || 'serialized',
        added_serials: [],
        quantity: asset.quantity ?? 1,
        reorder_level: asset.reorder_level || '',
        daily_rate: asset.daily_rate || '',
        replacement_value: asset.replacement_value || '',
        purchase_price: asset.purchase_price || '',
        subrent_cost: asset.subrent_cost || '',
        pricing_tier: asset.pricing_tier || 'retail',
        max_discount_pct: asset.max_discount_pct ?? 50,
        taxable: asset.taxable !== false,
        discountable: asset.discountable !== false,
        status: asset.status || 'available',
        condition: asset.condition || 'good',
        location: asset.location || 'Warehouse',
        purchase_date: asset.purchase_date || '',
        ownership_type: asset.ownership_type || 'owned',
        partner_owner_id: asset.partner_owner_id || '',
        partner_owner_name: asset.partner_owner_name || '',
        partner_use_allowed: asset.partner_use_allowed !== false,
        partner_approval_required: asset.partner_approval_required || false,
        partner_agreement_notes: asset.partner_agreement_notes || '',
        weight_kg: asset.weight_kg || '',
        country_of_origin: asset.country_of_origin || '',
        vendor: asset.vendor || '',
        warranty_expiry: asset.warranty_expiry || '',
        notes: asset.notes || '',
        custom_fields: asset.custom_fields || {},
        home_container_id: asset.home_container_id || '',
        home_container_name: asset.home_container_name || '',
        current_container_id: asset.current_container_id || '',
        current_container_name: asset.current_container_name || '',
        permanent_container: asset.permanent_container || false,
        can_move_to_show_container: asset.can_move_to_show_container !== false,
        storage_notes: asset.storage_notes || '',
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [asset, open]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const updateCustomField = (key, value) => setFormData(prev => ({ ...prev, custom_fields: { ...prev.custom_fields, [key]: value } }));

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {};
      for (const field of CORE_FIELDS) {
        if (field === 'serial_numbers') {
          let serialNumbers = (data.serial_numbers || data.serial_number || '').trim();
          if (data.added_serials?.length > 0) {
            const existing = serialNumbers.split(',').map(s => s.trim()).filter(s => s);
            serialNumbers = [...existing, ...data.added_serials].join(',');
          }
          payload.serial_numbers = serialNumbers;
        } else if (data.hasOwnProperty(field)) {
          payload[field] = data[field];
        }
      }

      payload.purchase_price = payload.purchase_price ? Number(payload.purchase_price) : null;
      payload.replacement_value = payload.replacement_value ? Number(payload.replacement_value) : null;
      payload.weight_kg = payload.weight_kg ? Number(payload.weight_kg) : null;
      payload.daily_rate = payload.daily_rate ? Number(payload.daily_rate) : null;
      payload.max_discount_pct = payload.max_discount_pct ? Number(payload.max_discount_pct) : 50;
      payload.quantity = payload.quantity ? Number(payload.quantity) : null;
      payload.subrent_cost = payload.subrent_cost ? Number(payload.subrent_cost) : null;
      payload.reorder_level = payload.reorder_level ? Number(payload.reorder_level) : null;

      Object.keys(payload).forEach(key => { if (payload[key] === null) delete payload[key]; });

      if (isEditing) return db.entities.Asset.update(asset.id, payload);
      return db.entities.Asset.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Asset updated' : 'Asset created');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  });

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) { toast.error('Name is required'); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else mutation.mutate(formData);
  };

  const handleBack = () => setStep(s => s - 1);
  const isLastStep = step === STEPS.length - 1;
  const startStep = isEditing ? 1 : 0;

  const stepProps = { formData, set };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-base">
              {isEditing ? `Edit — ${asset?.name}` : 'Add New Asset'}
            </DialogTitle>

            {/* Step progress bar */}
            <div className="mt-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {STEPS.map((s, i) => {
                  if (isEditing && i === 0) return null;
                  const done = i < step;
                  const active = i === step;
                  return (
                    <React.Fragment key={i}>
                      <button
                        type="button"
                        onClick={() => i < step && setStep(i)}
                        disabled={i > step}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : done
                            ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                        <span>{s.label}</span>
                      </button>
                      {i < STEPS.length - 1 && !isEditing && (
                        <div className={`h-px flex-1 min-w-[8px] ${i < step ? 'bg-primary/40' : 'bg-border'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </DialogHeader>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 0 && <Step1ItemType {...stepProps} />}
            {step === 1 && <Step2ProductDetails {...stepProps} categories={categories} />}
            {step === 2 && <Step3Tracking {...stepProps} allAssets={allAssets} asset={asset} />}
            {step === 3 && <Step4Pricing {...stepProps} />}
            {step === 4 && <Step5Location {...stepProps} partners={partners} />}
            {step === 5 && <Step6ExtraDetails {...stepProps} customFields={customFields} updateCustomField={updateCustomField} />}
            {step === 6 && <Step7Review formData={formData} />}
          </div>

          {/* Footer navigation */}
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step > startStep && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              {isEditing && (
                <Button type="button" variant="outline" size="sm" onClick={() => setQrPrinterOpen(true)}>
                  <QrCode className="w-4 h-4 mr-1.5" /> Print QR
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={handleNext} disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : isLastStep ? (isEditing ? 'Update Asset' : 'Create Asset') : (
                  <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isEditing && asset && (
        <QRLabelPrinter open={qrPrinterOpen} onOpenChange={setQrPrinterOpen} assets={[asset]} />
      )}
    </>
  );
}