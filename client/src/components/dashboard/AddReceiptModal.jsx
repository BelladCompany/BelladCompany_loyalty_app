import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  RefreshCw,
  UploadCloud,
  MessageSquare,
  Lock,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Wrench,
  Package,
  Eye,
  ExternalLink,
  Clock,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  RotateCcw,
  Calculator,
  Percent,
} from 'lucide-react';
import CopyButton from '../ui/CopyButton';
import ApiService from '../../services/api';

// 4 GST Rates Configuration: 3%, 5%, 18%, 40% (each segregated 50/50 into CGST and SGST)
const GST_SLABS = [
  { rate: 18, halfRate: 9, label: '18% GST', shortLabel: '18% (9%+9%)', note: 'Standard Dealership Service & Parts' },
  { rate: 5, halfRate: 2.5, label: '5% GST', shortLabel: '5% (2.5%+2.5%)', note: 'Lubricants & Oils' },
  { rate: 3, halfRate: 1.5, label: '3% GST', shortLabel: '3% (1.5%+1.5%)', note: 'Special Category' },
  { rate: 40, halfRate: 20, label: '40% GST', shortLabel: '40% (20%+20%)', note: 'Luxury / High Cess' },
];

const formatInr = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Categories configuration (Service, Bodyshop, Accessories)
const CATEGORIES = [
  { id: 'service', label: 'Service' },
  { id: 'bodyshop', label: 'Bodyshop' },
  { id: 'accessories', label: 'Accessories' },
];

/**
 * AddReceiptModal
 *
 * Full-page 2-Column Dealership Receipt & Advisor Invoice Queue Interface:
 * - Left Column: Drag & Drop Invoice PDF Uploader + Day-Wise Uploaded Invoice Queue (Pending / Completed).
 * - Right Column: Comprehensive Receipt Entry Form with Live Points Breakdown & Auto-Redemption.
 * - Advisor Role: Drag & drop invoices to store in backend folder & queue for cashier processing.
 * - Cashier Role: Pick pending invoices from queue or upload live, auto-fill receipt, record spare parts, award points.
 */
export const AddReceiptModal = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
  branches = [{ id: 1, name: 'Central Showroom - Bangalore' }],
  user,
}) => {
  const currentUser = user || ApiService.getUser();
  const isAdvisor = currentUser?.role === 'advisor';

  const resolveCashierBranch = () => {
    if (!currentUser) {
      return branches[0]?.id || branches[0]?.branch_id || 1;
    }

    if (currentUser.branch_id && branches?.length > 0) {
      const matched = branches.find(
        (b) => String(b.id || b.branch_id) === String(currentUser.branch_id)
      );
      if (matched) return matched.id || matched.branch_id;
    }

    const searchCity = (currentUser.branch_city || '').toLowerCase().trim();
    const searchName = (currentUser.branch_name || '').toLowerCase().trim();

    if ((searchCity || searchName) && branches?.length > 0) {
      const matched = branches.find((b) => {
        const bName = (b.name || b.branch_name || '').toLowerCase();
        const bCity = (b.address || b.city || b.branch_city || '').toLowerCase();
        if (searchCity && (bCity.includes(searchCity) || bName.includes(searchCity))) return true;
        if (searchName && (bName.includes(searchName) || searchName.includes(bName))) return true;
        return false;
      });
      if (matched) return matched.id || matched.branch_id;
    }

    if (currentUser.branch_id) return currentUser.branch_id;
    return branches[0]?.id || branches[0]?.branch_id || 1;
  };

  const [category, setCategory] = useState('service');
  const [wantRedemption, setWantRedemption] = useState(true);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [branchId, setBranchId] = useState(() => resolveCashierBranch());
  const [notes, setNotes] = useState('');

  const vehicles = customer?.vehicles || [];
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Live vehicle eligibility
  const [eligibilityData, setEligibilityData] = useState(null);

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  // RealBooks sync status
  const [pushingToRealbooks, setPushingToRealbooks] = useState(false);
  const [realbooksSynced, setRealbooksSynced] = useState(null);

  // V2 Dealership Invoice OCR States
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState(null);
  const [showPartsList, setShowPartsList] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Advisor Invoice Queue States
  const [queueItems, setQueueItems] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueFilter, setQueueFilter] = useState('pending'); // 'pending', 'completed', 'all'
  const [queueSearch, setQueueSearch] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [queueActionMessage, setQueueActionMessage] = useState('');

  // Dynamic GST Slabs (3%, 5%, 18%, 40%) States
  const [selectedGstRate, setSelectedGstRate] = useState(18); // 18, 5, 3, 40, or 'all'
  const [gstAmounts, setGstAmounts] = useState({
    18: { parts: '', labour: '' },
    5: { parts: '', labour: '' },
    3: { parts: '', labour: '' },
    40: { parts: '', labour: '' },
  });
  const [isGstTableExpanded, setIsGstTableExpanded] = useState(true);

  // Helper to extract GST parts & labour from OCR parsed invoice
  const populateGstFromParsedData = (parsed) => {
    if (!parsed) return;
    const newGst = {
      18: { parts: '', labour: '' },
      5: { parts: '', labour: '' },
      3: { parts: '', labour: '' },
      40: { parts: '', labour: '' },
    };

    if (Array.isArray(parsed.line_items) && parsed.line_items.length > 0) {
      let matchedRate = 18;
      const sums = { 18: { p: 0, l: 0 }, 5: { p: 0, l: 0 }, 3: { p: 0, l: 0 }, 40: { p: 0, l: 0 } };
      parsed.line_items.forEach((li) => {
        const r = (Number(li.cgst_rate_percent) || 0) + (Number(li.sgst_rate_percent) || 0);
        let slabKey = 18;
        if (Math.abs(r - 3) < 0.5) slabKey = 3;
        else if (Math.abs(r - 5) < 0.5) slabKey = 5;
        else if (r >= 28) slabKey = 40;
        else slabKey = 18;

        matchedRate = slabKey;
        const val = li.taxable_value_paise != null ? (li.taxable_value_paise / 100) : (Number(li.taxable_value) || 0);
        if (li.item_type === 'part') {
          sums[slabKey].p += val;
        } else {
          sums[slabKey].l += val;
        }
      });

      GST_SLABS.forEach((s) => {
        newGst[s.rate] = {
          parts: sums[s.rate].p > 0 ? sums[s.rate].p.toFixed(2) : '',
          labour: sums[s.rate].l > 0 ? sums[s.rate].l.toFixed(2) : '',
        };
      });
      setGstAmounts(newGst);
      setSelectedGstRate(matchedRate);
    } else {
      const pVal = parsed.parts_taxable_paise ? (parsed.parts_taxable_paise / 100) : (parsed.summary?.parts_taxable_rupees || 0);
      const lVal = parsed.labour_taxable_paise ? (parsed.labour_taxable_paise / 100) : (parsed.summary?.labour_taxable_rupees || 0);
      if (pVal > 0 || lVal > 0) {
        newGst[18] = {
          parts: pVal > 0 ? Number(pVal).toFixed(2) : '',
          labour: lVal > 0 ? Number(lVal).toFixed(2) : '',
        };
        setGstAmounts(newGst);
        setSelectedGstRate(18);
      }
    }
  };

  const calculateSlabValues = (rate) => {
    const slab = GST_SLABS.find((s) => s.rate === rate) || GST_SLABS[0];
    const partsAmt = parseFloat(gstAmounts[slab.rate]?.parts || '0') || 0;
    const labourAmt = parseFloat(gstAmounts[slab.rate]?.labour || '0') || 0;

    const cgstParts = Math.round(partsAmt * slab.halfRate) / 100;
    const sgstParts = Math.round(partsAmt * slab.halfRate) / 100;
    const cgstLabour = Math.round(labourAmt * slab.halfRate) / 100;
    const sgstLabour = Math.round(labourAmt * slab.halfRate) / 100;

    const totalTaxable = partsAmt + labourAmt;
    const totalTax = cgstParts + sgstParts + cgstLabour + sgstLabour;
    const grossTotal = totalTaxable + totalTax;

    return {
      slab,
      partsAmt,
      labourAmt,
      cgstParts,
      sgstParts,
      cgstLabour,
      sgstLabour,
      totalTaxable,
      totalTax,
      grossTotal,
    };
  };

  const calculateAllSlabsTotal = () => {
    let grandTaxable = 0;
    let grandTax = 0;
    let grandGross = 0;
    GST_SLABS.forEach((s) => {
      const vals = calculateSlabValues(s.rate);
      grandTaxable += vals.totalTaxable;
      grandTax += vals.totalTax;
      grandGross += vals.grossTotal;
    });
    return { grandTaxable, grandTax, grandGross };
  };

  const handleAutoDistributeFromBill = (rateToUse = selectedGstRate) => {
    const total = parseFloat(billAmount || '0') || 0;
    if (total <= 0) return;
    const targetRate = rateToUse === 'all' ? 18 : Number(rateToUse);
    const slab = GST_SLABS.find((s) => s.rate === targetRate) || GST_SLABS[0];
    const taxableTotal = total / (1 + slab.rate / 100);
    // Typical automotive ratio: 80% parts, 20% labour
    const pAmt = Number((taxableTotal * 0.8).toFixed(2));
    const lAmt = Number((taxableTotal - pAmt).toFixed(2));
    setGstAmounts((prev) => ({
      ...prev,
      [slab.rate]: { parts: String(pAmt), labour: String(lAmt) },
    }));
  };

  // Fetch Advisor Invoice Queue
  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await ApiService.getAdvisorInvoiceQueue({
        status: queueFilter === 'all' ? undefined : queueFilter,
        search: queueSearch.trim() || undefined,
      });
      setQueueItems(res.data || []);
    } catch (err) {
      console.warn('[AddReceiptModal] Error fetching queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
    }
  }, [isOpen, queueFilter]);

  // Load a queued invoice into the right-hand receipt form
  const handleLoadFromQueue = (item) => {
    setSelectedQueueId(item.id);
    const parsed = item.parsed_preview || {};
    setOcrExtractedData(parsed);

    if (item.invoice_number || parsed.invoice_number) {
      setReceiptNo(item.invoice_number || parsed.invoice_number);
    }

    if (item.net_amount_paise) {
      setBillAmount(String(item.net_amount_paise / 100));
    } else if (parsed.summary?.net_payable_rupees != null) {
      setBillAmount(String(parsed.summary.net_payable_rupees));
    }

    if (parsed.job_card_number && !notes) {
      setNotes(parsed.job_card_number);
    }

    // Auto-populate GST Table from OCR data
    populateGstFromParsedData(parsed);

    // Auto-match vehicle
    const targetReg = (item.registration_number || parsed.registration_number || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const targetVin = (parsed.vin || '').toUpperCase();
    if (vehicles.length > 0 && (targetReg || targetVin)) {
      const matchedVeh = vehicles.find((v) => {
        const vReg = (v.registration_number || v.reg_no || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const vVin = (v.vin || v.chassis_no || '').toUpperCase();
        return (targetReg && vReg.includes(targetReg)) || (targetVin && vVin === targetVin);
      });
      if (matchedVeh) {
        setSelectedVehicleId(String(matchedVeh.id || matchedVeh.vehicle_id));
      }
    }

    setQueueActionMessage(`Loaded Invoice #${item.invoice_number || item.original_filename} into receipt form.`);
    setTimeout(() => setQueueActionMessage(''), 4000);
  };

  // Upload PDF Handler (Uploads to backend folder & adds to queue)
  const handleOcrFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please upload a valid PDF invoice document.');
      return;
    }

    setIsScanningOcr(true);
    setErrorMessage('');

    try {
      const res = await ApiService.uploadAdvisorInvoice(file, {
        customerId: customer?.customer_id,
        vehicleId: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
        autoSave: true,
      });

      const queueRecord = res.data || res;
      const parsed = queueRecord.parsed_data || queueRecord.parsed_preview || res.data;

      // Refresh queue list
      await fetchQueue();

      // If user is Cashier (or Admin), automatically populate form
      if (!isAdvisor && parsed) {
        handleLoadFromQueue(queueRecord);
      } else if (isAdvisor) {
        setQueueActionMessage(`Invoice "${file.name}" uploaded to queue successfully for Cashier processing.`);
        setTimeout(() => setQueueActionMessage(''), 5000);
      }
    } catch (err) {
      console.error('[AddReceiptModal] Upload error:', err);
      // Fallback direct parse if needed
      try {
        const directRes = await ApiService.parseInvoicePdf(file, {
          save: true,
          branchId: branchId || 1,
          customerId: customer?.customer_id,
          customerName: customer?.name || customer?.customer_name,
          customerPhone: primaryPhone,
          vehicleId: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
        });
        const parsed = directRes.data || directRes;
        setOcrExtractedData(parsed);
        populateGstFromParsedData(parsed);
        if (parsed.invoice_number) setReceiptNo(parsed.invoice_number);
        if (parsed.summary?.net_payable_rupees != null) setBillAmount(String(parsed.summary.net_payable_rupees));
      } catch (fallbackErr) {
        setErrorMessage(err.message || 'Failed to scan invoice PDF. Please enter details manually.');
      }
    } finally {
      setIsScanningOcr(false);
    }
  };

  const currentPoints = Math.max(0, customer?.points_balance ?? customer?.total_points ?? customer?.current_balance ?? 0);
  const rupeeValue = Math.max(0, Math.floor(currentPoints / 4));

  const primaryPhone =
    (typeof customer?.phones?.[0] === 'string' ? customer.phones[0] : customer?.phones?.[0]?.phone_number) ||
    customer?.phone ||
    '';

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setCategory('service');
      setWantRedemption(true);
      setPaymentMode('UPI');
      setUtrNumber('');
      setBillAmount('');
      setReceiptNo('');
      setBranchId(resolveCashierBranch());
      setNotes('');
      setErrorMessage('');
      setSuccessData(null);
      setPushingToRealbooks(false);
      setRealbooksSynced(null);
      setIsScanningOcr(false);
      setOcrExtractedData(null);
      setShowPartsList(false);
      setIsDraggingFile(false);
      setSelectedQueueId(null);
      setQueueActionMessage('');
      setGstAmounts({
        18: { parts: '', labour: '' },
        5: { parts: '', labour: '' },
        3: { parts: '', labour: '' },
        40: { parts: '', labour: '' },
      });
      setSelectedGstRate(18);
      setIsGstTableExpanded(true);

      if (vehicles.length > 0) {
        setSelectedVehicleId(String(vehicles[0].id || vehicles[0].vehicle_id || ''));
      }
    }
  }, [isOpen]);

  // Handle ESC key to exit full screen form
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Fetch redemption eligibility when vehicle or category changes
  useEffect(() => {
    if (!isOpen || !selectedVehicleId) return;

    ApiService.getVehicleRedemptionStatus(selectedVehicleId, category)
      .then((res) => {
        setEligibilityData(res.data || null);
      })
      .catch(() => {
        setEligibilityData(null);
      });
  }, [isOpen, selectedVehicleId, category]);

  if (!isOpen || !customer) return null;

  const selectedVeh = vehicles.find((v) => String(v.id || v.vehicle_id) === String(selectedVehicleId)) || vehicles[0];

  // Determine eligibility status
  const isAccessories = category === 'accessories';
  let isEligible = false;
  let lockReason = '';

  if (currentPoints <= 0) {
    isEligible = false;
    lockReason = 'Customer has 0 points available to redeem. Points will be earned on this receipt.';
  } else if (isAccessories) {
    isEligible = true;
    lockReason = '';
  } else if (eligibilityData) {
    if (eligibilityData.status === 'eligible') {
      isEligible = true;
      lockReason = '';
    } else {
      isEligible = false;
      lockReason = eligibilityData.message || 'Points redemption is locked until 12 months after purchase date. (Accessories redemption is unlocked anytime).';
    }
  } else {
    const rawDate = selectedVeh?.purchase_date || selectedVeh?.dms_invoice_date || customer?.purchase_date || customer?.dms_invoice_date;
    if (rawDate) {
      const pDate = new Date(rawDate);
      if (!isNaN(pDate.getTime())) {
        const eligibleAt = new Date(pDate);
        eligibleAt.setMonth(eligibleAt.getMonth() + 12);
        if (new Date() < eligibleAt) {
          isEligible = false;
          const eligibleDateStr = eligibleAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          lockReason = `Redemption locked until 12 months from purchase date (${eligibleDateStr}). Accessories can be redeemed anytime!`;
        } else {
          isEligible = true;
        }
      } else {
        isEligible = true;
      }
    } else {
      isEligible = true;
    }
  }

  // Calculations
  const numAmount = parseFloat(billAmount || '0') || 0;
  const rateMultiplier = category === 'service' ? 4 : category === 'accessories' ? 2 : category === 'bodyshop' ? 3 : 1;
  const modelCapPercent = eligibilityData?.redemption_cap_percent != null ? Number(eligibilityData.redemption_cap_percent) : 100;
  const maxAllowedPointsByModel = Math.floor(currentPoints * (modelCapPercent / 100));

  const activeRedeemPoints = isEligible && wantRedemption && numAmount > 0 
    ? Math.min(maxAllowedPointsByModel, Math.floor(numAmount * 4)) 
    : 0;
  const discountAmount = Math.floor(activeRedeemPoints / 4);
  const netCashPaid = Math.max(0, numAmount - discountAmount);

  // Before-Tax Spend Determination:
  // 1. From GST Table (OCR / breakdown inputs) if available
  const allSlabsTotals = calculateAllSlabsTotal();
  const rawTaxableFromGst = allSlabsTotals?.grandTaxable || 0;

  // 2. Fallback: if user manually enters billAmount without filling GST table, back-calculate using chosen GST slab
  const defaultSlabRate = selectedGstRate === 'all' ? 18 : Number(selectedGstRate || 18);
  const effectiveTaxableAmount = category === 'sale'
    ? numAmount
    : (rawTaxableFromGst > 0
        ? rawTaxableFromGst
        : (numAmount > 0 ? Number((numAmount / (1 + defaultSlabRate / 100)).toFixed(2)) : 0));

  // 3. For sales: strictly keep Ex-Showroom amount (user requested "dont touch for sale this is for reedemption")
  // For service/accessories/bodyshop: loyalty points are calculated on Before-Tax Taxable Base net of discount!
  const netTaxableSpend = category === 'sale'
    ? numAmount
    : Math.max(0, effectiveTaxableAmount - discountAmount);

  const earnedPoints = netTaxableSpend > 0 ? Math.floor((netTaxableSpend / 100) * rateMultiplier) : 0;
  const projectedBalance = Math.max(0, currentPoints - activeRedeemPoints) + earnedPoints;

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdvisor) {
      setErrorMessage('Advisor role is view-only. Receipts must be finalized and submitted by Cashier.');
      return;
    }

    setErrorMessage('');

    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid bill amount greater than ₹0.');
      return;
    }
    if (!receiptNo.trim()) {
      setErrorMessage('Receipt / Invoice Number is strictly required.');
      return;
    }
    if (!utrNumber.trim()) {
      setErrorMessage('UTR / Transaction Reference Number is mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEligible && wantRedemption && activeRedeemPoints > 0) {
        // Redemption Flow (Before-Tax Loyalty Earning Net of Discount)
        const payload = {
          customer_id: customer.customer_id,
          phone: primaryPhone ? String(primaryPhone).replace(/[^\d+]/g, '') : undefined,
          bill_amount: numAmount,
          taxable_amount: category === 'sale' ? numAmount : Number(effectiveTaxableAmount.toFixed(2)),
          points: activeRedeemPoints,
          category: category,
          receipt_no: receiptNo.trim(),
          payment_mode: paymentMode,
          utr_number: utrNumber.trim(),
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
          branch_id: branchId ? parseInt(branchId, 10) : 1,
        };

        const res = await ApiService.redeemPoints(payload);
        const resData = res.data || res;
        const ptsEarned = resData.new_points_earned ?? earnedPoints;
        const updatedBalance = resData.updated_total_balance ?? resData.remaining_balance ?? resData.balance?.remaining_balance ?? (Math.max(0, currentPoints - activeRedeemPoints) + ptsEarned);

        // Mark invoice queue item as completed if loaded from queue
        if (selectedQueueId) {
          try {
            await ApiService.updateAdvisorInvoiceStatus(selectedQueueId, 'completed');
            fetchQueue();
          } catch (qErr) {
            console.warn('[AddReceiptModal] Could not update queue status:', qErr);
          }
        }

        setSuccessData({
          type: 'redemption',
          billAmount: numAmount,
          taxableAmount: effectiveTaxableAmount,
          netTaxableSpend: netTaxableSpend,
          discountAmount: resData.discount_applied ?? discountAmount,
          cashPaid: resData.cash_paid ?? netCashPaid,
          pointsRedeemed: resData.points_redeemed ?? activeRedeemPoints,
          pointsEarned: ptsEarned,
          newBalance: updatedBalance,
          receiptNo: receiptNo.trim(),
          paymentMode,
          utrNumber: utrNumber.trim(),
          category,
          branchId: branchId ? parseInt(branchId, 10) : 1,
          jobCard: notes.trim(),
          vehicleId: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
          model: selectedVeh?.model || null,
          brandName: selectedVeh?.brand_name || null,
          firmName: selectedVeh?.firm_name || null,
          branchName: selectedVeh?.branch_name || null,
        });
      } else {
        // Standard Points Earning Flow (Before-tax for service/parts/bodyshop; Ex-showroom for sales)
        const payload = {
          customer_id: customer.customer_id,
          vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
          branch_id: branchId ? parseInt(branchId, 10) : 1,
          amount: Math.round(numAmount),
          taxable_amount: category === 'sale' ? Math.round(numAmount) : Number(effectiveTaxableAmount.toFixed(2)),
          type: category === 'sale' ? 'sale' : 'service',
          category: category,
          reference_id: receiptNo.trim(),
          receipt_no: receiptNo.trim(),
          payment_mode: paymentMode,
          utr_number: utrNumber.trim(),
          description: `${receiptNo.trim()} | ${category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()} | Mode: ${paymentMode} | UTR: ${utrNumber.trim()}${notes.trim() ? ` (${notes.trim()})` : ''}`,
        };

        const res = await ApiService.earnPoints(payload);
        const resData = res.data || res;
        const pts = resData?.ledger_entry?.points ?? earnedPoints;
        const updatedBalance = currentPoints + pts;

        // Mark invoice queue item as completed if loaded from queue
        if (selectedQueueId) {
          try {
            await ApiService.updateAdvisorInvoiceStatus(selectedQueueId, 'completed');
            fetchQueue();
          } catch (qErr) {
            console.warn('[AddReceiptModal] Could not update queue status:', qErr);
          }
        }

        setSuccessData({
          type: 'earning',
          billAmount: numAmount,
          taxableAmount: effectiveTaxableAmount,
          netTaxableSpend: netTaxableSpend,
          discountAmount: 0,
          cashPaid: numAmount,
          pointsRedeemed: 0,
          pointsEarned: pts,
          newBalance: updatedBalance,
          receiptNo: receiptNo.trim(),
          paymentMode,
          utrNumber: utrNumber.trim(),
          category,
          branchId: branchId ? parseInt(branchId, 10) : 1,
          jobCard: notes.trim(),
          vehicleId: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
          model: selectedVeh?.model || null,
          brandName: selectedVeh?.brand_name || null,
          firmName: selectedVeh?.firm_name || null,
          branchName: selectedVeh?.branch_name || null,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process receipt transaction. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePushToRealbooks = async () => {
    if (!successData || pushingToRealbooks || (realbooksSynced && realbooksSynced.success !== false && realbooksSynced.status !== 'failed')) return;
    setPushingToRealbooks(true);

    try {
      const res = await ApiService.pushRealbooksSync({
        receipt_no: successData.receiptNo,
        customer_id: customer.customer_id,
        vehicle_id: successData.vehicleId || (selectedVehicleId ? parseInt(selectedVehicleId, 10) : null),
        model: successData.model || selectedVeh?.model || null,
        brand_name: successData.brandName || selectedVeh?.brand_name || null,
        firm_name: successData.firmName || selectedVeh?.firm_name || null,
        branch_name: successData.branchName || selectedVeh?.branch_name || null,
        bill_amount: successData.billAmount,
        discount_amount: successData.discountAmount,
        points_redeemed: successData.pointsRedeemed,
        category: successData.category,
        branch_id: successData.branchId || branchId || 1,
        job_card: successData.jobCard || notes.trim() || '',
      });
      const data = res.data || res;
      setRealbooksSynced(data);
    } catch (err) {
      setRealbooksSynced({
        success: false,
        status: 'failed',
        error: err.message || 'Failed to push to RealBooks',
      });
    } finally {
      setPushingToRealbooks(false);
    }
  };

  const handleClose = () => {
    if (successData && onSuccess) {
      try { onSuccess(); } catch (err) { console.warn('[AddReceiptModal] Close refresh warning:', err); }
    }
    onClose();
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  const isBranchAutoSelected = Boolean(
    currentUser?.branch_id && String(branchId) === String(currentUser.branch_id)
  );

  // Group queue items day-wise
  const groupedQueue = queueItems.reduce((acc, item) => {
    const rawDate = item.upload_date || (item.created_at ? item.created_at.substring(0, 10) : 'Recent');
    let dateLabel = rawDate;
    try {
      const d = new Date(rawDate);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        dateLabel = 'Today';
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
          dateLabel = 'Yesterday';
        } else {
          dateLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    } catch (_) {}

    if (!acc[dateLabel]) {
      acc[dateLabel] = [];
    }
    acc[dateLabel].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-100 flex flex-col overflow-hidden animate-fadeIn">
      <div className="relative w-full h-full bg-white flex flex-col overflow-hidden">

        {/* ── Top Header Full Width ── */}
        <header className="px-5 sm:px-6 py-3 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800 shadow-sm z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer shrink-0 border border-white/10"
              title="Return to Customer 360 (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Customer</span>
            </button>
            <div className="h-5 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                POS
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight truncate">
                    {isAdvisor ? 'Advisor Invoice Upload & Queue' : 'Add Receipt Counter'}
                  </h1>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    Full Screen Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate hidden md:block">
                  {isAdvisor
                    ? 'Upload invoice PDFs in bulk or single files to queue for Cashier processing'
                    : 'Process customer receipts, dynamic GST calculations, points redemption & RealBooks integration'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Close Full Screen Form (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </header>

        {/* ── Customer Context Strip ── */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs inline-flex items-center gap-1 select-text">
              <span>{customer.customer_id}</span>
              <CopyButton text={customer.customer_id} size="xs" title="Copy Customer ID" />
            </span>
            <div className="inline-flex items-center gap-1">
              <span className="font-black text-slate-900 text-sm select-text">{customer.name || customer.customer_name}</span>
              <CopyButton text={customer.name || customer.customer_name} size="xs" title="Copy Customer Name" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {customer.tier_name || 'Silver'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-xs">Available Points:</span>
              <span className="font-mono font-black text-indigo-700 text-xs sm:text-sm">{Number(currentPoints).toLocaleString('en-IN')} PTS</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs">
                ≈ ₹{rupeeValue.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
              {queueItems.filter((i) => i.status === 'pending').length} Pending Invoices in Queue
            </span>
          </div>
        </div>

        {/* ── Main Body: Success Screen OR 2-Column Full Layout ── */}
        {successData ? (
          <div className="p-6 sm:p-10 space-y-5 text-center animate-fadeIn flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Receipt Processed Successfully!</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Receipt #{successData.receiptNo} has been saved in the loyalty ledger.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-600">
                <span>Operation Category</span>
                <span className="font-bold text-slate-900 uppercase">{successData.category}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-600">
                <span>Total Bill Amount</span>
                <span className="font-bold text-slate-900">₹{Number(successData.billAmount).toLocaleString('en-IN')}</span>
              </div>
              {successData.discountAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-emerald-700 font-semibold">
                    <span>Loyalty Points Redeemed ({successData.pointsRedeemed} PTS)</span>
                    <span className="font-black">- ₹{Number(successData.discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-900 font-bold">
                    <span>Net Cash Collected</span>
                    <span className="text-base font-black text-indigo-700 font-mono">
                      ₹{Number(successData.cashPaid).toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
              {successData.category !== 'sale' && successData.taxableAmount > 0 && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-600">
                  <span>Pre-Tax Base / Net Taxable</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    ₹{Number(successData.taxableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {successData.discountAmount > 0 ? ` (Net: ₹${Number(successData.netTaxableSpend || (successData.taxableAmount - successData.discountAmount)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs pt-1 text-slate-700">
                <span className="font-bold flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" /> New Points Earned:
                </span>
                <span className="font-black text-amber-600 text-sm">+{successData.pointsEarned} PTS</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 text-slate-900 font-black">
                <span>Updated Customer Balance</span>
                <span className="text-sm sm:text-base text-slate-900 font-mono">
                  {Number(successData.newBalance).toLocaleString('en-IN')} PTS (≈ ₹{(successData.newBalance * 0.25).toFixed(2)})
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-left gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-950 block truncate">
                  Automated WhatsApp Alert Dispatched
                </span>
                <span className="text-[11px] text-emerald-800 font-medium block truncate">
                  Receipt details & updated balance sent to customer ({primaryPhone || 'registered phone'})
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
              <button
                type="button"
                disabled={pushingToRealbooks || (realbooksSynced && realbooksSynced.success !== false && realbooksSynced.status !== 'failed')}
                onClick={handlePushToRealbooks}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer ${
                  realbooksSynced?.status === 'failed' || realbooksSynced?.success === false
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : realbooksSynced
                    ? 'bg-indigo-600 text-white opacity-90'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {pushingToRealbooks ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Pushing to RealBooks...
                  </>
                ) : realbooksSynced?.success || realbooksSynced?.status === 'synced' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Pushed to RealBooks ({realbooksSynced.voucher_no || 'Voucher Synced'})
                  </>
                ) : realbooksSynced?.status === 'failed' || realbooksSynced?.success === false ? (
                  <>
                    <AlertCircle className="w-4 h-4" /> Retry Push to RealBooks
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" /> Push to RealBooks
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-6 py-3 font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-md cursor-pointer"
              >
                Done &amp; Close
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">

            {/* ══════════════════════════════════════════════════════════════════════════
                LEFT COLUMN (lg:col-span-5): Upload Zone & Day-Wise Invoice Queue
            ══════════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 border-r border-slate-200 bg-slate-50/70 flex flex-col h-full min-h-0 overflow-hidden">

              {/* PDF Dropzone Header Section */}
              <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleOcrFileUpload(f);
                    e.target.value = '';
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleOcrFileUpload(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDraggingFile
                      ? 'bg-indigo-50 border-indigo-500 scale-[0.99]'
                      : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/80 hover:border-indigo-400'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                    {isScanningOcr ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {isScanningOcr
                        ? 'Scanning Invoice PDF & Cataloging Parts...'
                        : 'Drag & Drop Invoice PDF Here or Browse'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                      Hero, Hyundai, Tata PDF invoices • Saves to backend folder & OCRs automatically
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-black text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {isAdvisor ? 'Advisor Queue Upload' : 'Auto-Fill Receipt'}
                  </span>
                </div>

                {queueActionMessage && (
                  <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{queueActionMessage}</span>
                  </div>
                )}
              </div>

              {/* Queue Controls Bar: Search & Status Filters */}
              <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setQueueFilter('pending')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      queueFilter === 'pending'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pending ({queueItems.filter((i) => i.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('completed')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      queueFilter === 'completed'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      queueFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search queue..."
                      value={queueSearch}
                      onChange={(e) => setQueueSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') fetchQueue();
                      }}
                      className="h-8 pl-8 pr-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 w-36 sm:w-44 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchQueue}
                    disabled={isLoadingQueue}
                    className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Refresh Queue"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Day-Wise Grouped Invoices Queue List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
                {isLoadingQueue ? (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                    <p className="font-semibold">Loading uploaded invoices...</p>
                  </div>
                ) : Object.keys(groupedQueue).length === 0 ? (
                  <div className="py-12 px-4 text-center text-xs text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No invoices in this queue</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Drag & drop an invoice PDF above. It will be stored on the backend disk and listed here day-wise.
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedQueue).map(([dateLabel, items]) => (
                    <div key={dateLabel} className="space-y-2">
                      {/* Day Header Badge */}
                      <div className="flex items-center gap-2 px-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {dateLabel}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({items.length} {items.length === 1 ? 'invoice' : 'invoices'})
                        </span>
                        <div className="flex-1 h-px bg-slate-200 ml-1" />
                      </div>

                      {/* Invoice Cards */}
                      <div className="space-y-2">
                        {items.map((item) => {
                          const isSelected = selectedQueueId === item.id;
                          const isPending = item.status === 'pending';
                          const pdfUrl = (typeof ApiService.getAdvisorInvoicePdfUrl === 'function' && item?.id)
                            ? ApiService.getAdvisorInvoicePdfUrl(item.id)
                            : (item?.file_path ? `/${item.file_path}` : '#');
                          const amt = Number(item.net_amount_rupees || (item.net_amount_paise / 100) || 0);

                          return (
                            <div
                              key={item.id}
                              className={`p-3 bg-white rounded-2xl border transition shadow-xs ${
                                isSelected
                                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                                  : isPending
                                  ? 'border-slate-200 hover:border-indigo-300'
                                  : 'border-slate-200/70 opacity-85'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-xs text-slate-900">
                                      {item.invoice_number ? `#${item.invoice_number}` : 'Invoice'}
                                    </span>
                                    <span
                                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                        isPending
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                    {isSelected && (
                                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                                        Selected
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                                    {item.customer_name || 'Customer'}{' '}
                                    {item.registration_number ? `• ${item.registration_number}` : ''}
                                  </p>

                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-semibold truncate">
                                      By: {item.uploaded_by_username || 'Advisor'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(item.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-mono font-black text-sm text-slate-900 block">
                                    ₹{amt.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold block truncate max-w-[120px]" title={item.original_filename}>
                                    {item.original_filename}
                                  </span>
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <a
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                  title="Open raw PDF in new browser tab"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View PDF</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </a>

                                {!isAdvisor && isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleLoadFromQueue(item)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                    }`}
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{isSelected ? 'Loaded in Form' : 'Use / Load into Form'}</span>
                                  </button>
                                )}

                                {item.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    Receipt Processed
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════════
                RIGHT COLUMN (lg:col-span-7): Full Receipt Entry & Auto-Calculation Form
            ══════════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-0 overflow-hidden bg-white">
              <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">

                {/* Form Fields Scrollable Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">

                  {/* Advisor View-Only Notice Banner */}
                  {isAdvisor && (
                    <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-2.5 text-xs text-sky-900">
                      <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        ADV
                      </div>
                      <div>
                        <span className="font-bold text-sky-950 block">Advisor Role Notice</span>
                        <p className="text-sky-800 font-medium text-[11px] mt-0.5">
                          Advisors upload invoices to the queue on the left. Receipt entry, loyalty point disbursements, and redemptions are finalized by Cashiers.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Active Queue Item Loaded Strip */}
                  {selectedQueueId && (
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-bold text-indigo-950 block">
                            Invoice Loaded from Queue (#{receiptNo || 'Active'})
                          </span>
                          <span className="text-[11px] text-indigo-700 font-medium">
                            Details & spare parts populated automatically. Submitting receipt will mark queue status as completed.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQueueId(null);
                          setOcrExtractedData(null);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Error Notification Banner */}
                  {errorMessage && (
                    <div className="p-3 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div className="flex-1 font-semibold">{errorMessage}</div>
                    </div>
                  )}

                  {/* Extracted Spare Parts & Price Summary (if OCR data exists) */}
                  {ocrExtractedData && (
                    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border border-indigo-200 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 font-mono">
                                Invoice #{ocrExtractedData.invoice_number || receiptNo || 'Detected'}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {ocrExtractedData.brand_name || 'Dealer Invoice'}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                              {ocrExtractedData.customer_name ? `${ocrExtractedData.customer_name} • ` : ''}
                              {ocrExtractedData.model ? `${ocrExtractedData.model} • ` : ''}
                              {ocrExtractedData.registration_number || ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stats pills */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white/80 rounded-xl p-2.5 border border-indigo-100">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Spare Parts</span>
                          <span className="font-mono font-black text-indigo-700">
                            {ocrExtractedData.summary?.parts_count || 0} items (₹{Number(ocrExtractedData.summary?.parts_total_rupees || 0).toLocaleString('en-IN')})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Labour Jobs</span>
                          <span className="font-mono font-black text-slate-700">
                            {ocrExtractedData.summary?.labour_count || 0} ops (₹{Number(ocrExtractedData.summary?.labour_total_rupees || 0).toLocaleString('en-IN')})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Net Payable</span>
                          <span className="font-mono font-black text-emerald-700 text-sm">
                            ₹{Number(ocrExtractedData.summary?.net_payable_rupees || (ocrExtractedData.net_amount_paise / 100) || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Collapsible itemized parts view */}
                      {ocrExtractedData.line_items?.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowPartsList(!showPartsList)}
                            className="w-full flex items-center justify-between text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white/70 px-3 py-1.5 rounded-lg border border-indigo-100 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-indigo-600" />
                              {showPartsList ? 'Hide' : 'View'} Extracted Spare Parts & Price Table ({ocrExtractedData.line_items.filter((i) => i.item_type === 'part').length})
                            </span>
                            {showPartsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {showPartsList && (
                            <div className="mt-2 max-h-48 overflow-y-auto bg-white rounded-xl border border-slate-200 p-2 text-xs space-y-1">
                              <div className="grid grid-cols-12 font-bold text-[10px] text-slate-500 uppercase pb-1 border-b border-slate-100 px-1">
                                <span className="col-span-3">Part Code</span>
                                <span className="col-span-4">Description</span>
                                <span className="col-span-2 text-center">HSN</span>
                                <span className="col-span-1 text-center">Qty</span>
                                <span className="col-span-2 text-right">Total (₹)</span>
                              </div>
                              {ocrExtractedData.line_items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 py-1 px-1 border-b border-slate-50 text-[11px] items-center hover:bg-slate-50 rounded">
                                  <span className="col-span-3 font-mono font-bold text-indigo-900 truncate" title={item.item_code}>
                                    {item.item_code || '-'}
                                  </span>
                                  <span className="col-span-4 text-slate-800 font-medium truncate" title={item.item_description}>
                                    {item.item_description}
                                  </span>
                                  <span className="col-span-2 font-mono text-[10px] text-slate-500 text-center">
                                    {item.hsn_sac_code || '-'}
                                  </span>
                                  <span className="col-span-1 text-center font-bold text-slate-700">
                                    {item.quantity}
                                  </span>
                                  <span className="col-span-2 text-right font-mono font-bold text-slate-900">
                                    ₹{(item.total_amount_paise / 100).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. Category Selector Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Transaction Category *
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-black transition text-center cursor-pointer ${
                            category === cat.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Vehicle Selector */}
                  {vehicles.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Select Associated Vehicle
                      </label>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                      >
                        {vehicles.map((v) => {
                          const vid = String(v.id || v.vehicle_id);
                          return (
                            <option key={vid} value={vid}>
                              {v.registration_number || v.reg_no || 'Vehicle'} - {v.model || v.brand_name || 'Vehicle'} (Purchased: {v.purchase_date ? new Date(v.purchase_date).toLocaleDateString('en-IN') : 'N/A'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* 3. Lock Status Banner / Customer Choice */}
                  {!isEligible ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs">
                      <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] sm:text-[11px] block">
                          {currentPoints <= 0 ? 'No Points to Redeem' : 'Redemption Locked (<12 Months)'}
                        </span>
                        <p className="text-amber-800 font-medium text-[11px] sm:text-xs mt-0.5">
                          {lockReason || 'Points are locked for Service / Sales until 12 months from vehicle purchase. (Accessories redemption is unlocked anytime).'}
                        </p>
                      </div>
                    </div>
                  ) : currentPoints > 0 ? (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Redemption Choice: Take Discount or Keep Points?
                        </span>
                        <span className="text-[10px] text-indigo-700 font-bold font-mono">
                          Available: {currentPoints.toLocaleString()} PTS (₹{rupeeValue.toLocaleString()})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWantRedemption(true)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer ${
                            wantRedemption
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs">Redeem Points</span>
                            {wantRedemption && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className={`text-[10px] ${wantRedemption ? 'text-emerald-100' : 'text-slate-500'}`}>
                            {modelCapPercent < 100
                              ? `Take up to ${modelCapPercent}% model cap discount (-₹${Math.min(Math.floor(maxAllowedPointsByModel / 4), Math.floor(numAmount || 0))})`
                              : `Take full bill discount (-₹${Math.min(rupeeValue, Math.floor(numAmount || 0))})`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWantRedemption(false)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer ${
                            !wantRedemption
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs">Keep Points</span>
                            {!wantRedemption && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className={`text-[10px] ${!wantRedemption ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Do not redeem now, earn only on full bill
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* 4. Payment Mode, UTR & Bill Amount */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Payment Mode *
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => {
                            const m = e.target.value;
                            setPaymentMode(m);
                            if (m.toLowerCase() === 'cash' && !utrNumber) {
                              setUtrNumber('CASH');
                            } else if (utrNumber === 'CASH') {
                              setUtrNumber('');
                            }
                          }}
                          className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                          <option value="Card">Card (Debit / Credit)</option>
                          <option value="NEFT">NEFT (Bank Transfer)</option>
                          <option value="RTGS">RTGS (Bank Transfer)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          UTR No / Txn Ref *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={paymentMode.toLowerCase() === 'cash' ? 'Cash receipt ref or CASH' : 'e.g. 429182749281'}
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="w-full h-10 px-3 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                        />
                      </div>
                    </div>

                    {/* GST Breakdown Table (Dynamic 3%, 5%, 18%, 40%) */}
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-4 space-y-3 shadow-2xs">
                      {/* Header with Icon, Title and Rate Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <Calculator className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                GST Tax Breakdown Table
                              </span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                Dynamic
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Segregated CGST &amp; SGST on Parts &amp; Labour
                            </span>
                          </div>
                        </div>

                        {/* 4 Rate Selection Pills: 3%, 5%, 18%, 40% */}
                        <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                          {GST_SLABS.map((s) => (
                            <button
                              key={s.rate}
                              type="button"
                              onClick={() => setSelectedGstRate(s.rate)}
                              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                                selectedGstRate === s.rate
                                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                              title={`${s.label}: ${s.note}`}
                            >
                              {s.rate}%
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSelectedGstRate('all')}
                            className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                              selectedGstRate === 'all'
                                ? 'bg-indigo-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                            title="View all 4 slabs simultaneously"
                          >
                            All Slabs
                          </button>
                        </div>
                      </div>

                      {/* Single Slab View */}
                      {selectedGstRate !== 'all' ? (
                        (() => {
                          const {
                            slab,
                            partsAmt,
                            labourAmt,
                            cgstParts,
                            sgstParts,
                            cgstLabour,
                            sgstLabour,
                            totalTaxable,
                            totalTax,
                            grossTotal,
                          } = calculateSlabValues(selectedGstRate);

                          return (
                            <div className="space-y-3">
                              {/* Taxable Amount Inputs for Parts & Labour */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                      Parts Taxable (₹)
                                    </label>
                                    {partsAmt > 0 && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        +CGST/SGST: ₹{formatInr(partsAmt + cgstParts + sgstParts)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="e.g. 2487.29"
                                      value={gstAmounts[selectedGstRate]?.parts || ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setGstAmounts((prev) => ({
                                          ...prev,
                                          [selectedGstRate]: { ...prev[selectedGstRate], parts: v },
                                        }));
                                      }}
                                      className="w-full h-9 pl-6 pr-3 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                      Labour Taxable (₹)
                                    </label>
                                    {labourAmt > 0 && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        +CGST/SGST: ₹{formatInr(labourAmt + cgstLabour + sgstLabour)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="e.g. 378.90"
                                      value={gstAmounts[selectedGstRate]?.labour || ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setGstAmounts((prev) => ({
                                          ...prev,
                                          [selectedGstRate]: { ...prev[selectedGstRate], labour: v },
                                        }));
                                      }}
                                      className="w-full h-9 pl-6 pr-3 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Segregated Table Matching Reference Image Exactly */}
                              <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 space-y-1.5 font-mono text-xs sm:text-sm text-slate-900 shadow-2xs select-text">
                                <div className="flex items-center justify-between py-1 border-b border-slate-100/90">
                                  <span className="text-slate-800 font-medium">
                                    CGST(Parts) @ {slab.halfRate}% on Amount {formatInr(partsAmt)}
                                  </span>
                                  <span className="font-bold tabular-nums text-slate-900">{formatInr(cgstParts)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-slate-100/90">
                                  <span className="text-slate-800 font-medium">
                                    SGST(Parts) @ {slab.halfRate}% on Amount {formatInr(partsAmt)}
                                  </span>
                                  <span className="font-bold tabular-nums text-slate-900">{formatInr(sgstParts)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-slate-100/90">
                                  <span className="text-slate-800 font-medium">
                                    CGST(Labour) @ {slab.halfRate}% on Amount {formatInr(labourAmt)}
                                  </span>
                                  <span className="font-bold tabular-nums text-slate-900">{formatInr(cgstLabour)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                  <span className="text-slate-800 font-medium">
                                    SGST(Labour) @ {slab.halfRate}% on Amount {formatInr(labourAmt)}
                                  </span>
                                  <span className="font-bold tabular-nums text-slate-900">{formatInr(sgstLabour)}</span>
                                </div>
                              </div>

                              {/* Summary Action Row */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-slate-500 font-medium">
                                    Tax: <strong className="text-slate-800 font-mono">₹{formatInr(totalTax)}</strong>
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-700 font-bold">
                                    Calculated Gross: <strong className="text-indigo-700 font-mono text-xs sm:text-sm">₹{formatInr(grossTotal)}</strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {numAmount > 0 && partsAmt === 0 && labourAmt === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleAutoDistributeFromBill(selectedGstRate)}
                                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                      title="Auto-calculate Parts & Labour from existing Bill Amount"
                                    >
                                      Split from ₹{numAmount}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (grossTotal > 0) {
                                        setBillAmount(grossTotal.toFixed(2));
                                      }
                                    }}
                                    disabled={grossTotal <= 0}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Set Bill Amount to this calculated gross amount"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Set as Bill Amount</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* All 4 Slabs Combined View */
                        <div className="space-y-4">
                          {GST_SLABS.map((slab) => {
                            const {
                              partsAmt,
                              labourAmt,
                              cgstParts,
                              sgstParts,
                              cgstLabour,
                              sgstLabour,
                              totalTax,
                              grossTotal,
                            } = calculateSlabValues(slab.rate);

                            return (
                              <div key={slab.rate} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs font-bold">
                                  <span className="text-slate-900 font-black">{slab.label} ({slab.note})</span>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    Tax: ₹{formatInr(totalTax)} | Gross: ₹{formatInr(grossTotal)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Parts Taxable (${slab.rate}%)`}
                                    value={gstAmounts[slab.rate]?.parts || ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setGstAmounts((prev) => ({
                                        ...prev,
                                        [slab.rate]: { ...prev[slab.rate], parts: v },
                                      }));
                                    }}
                                    className="h-8 px-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Labour Taxable (${slab.rate}%)`}
                                    value={gstAmounts[slab.rate]?.labour || ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setGstAmounts((prev) => ({
                                        ...prev,
                                        [slab.rate]: { ...prev[slab.rate], labour: v },
                                      }));
                                    }}
                                    className="h-8 px-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                                  />
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 font-mono text-[11px] sm:text-xs space-y-1">
                                  <div className="flex justify-between text-slate-800">
                                    <span>CGST(Parts) @ {slab.halfRate}% on Amount {formatInr(partsAmt)}</span>
                                    <span className="font-bold">{formatInr(cgstParts)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-800">
                                    <span>SGST(Parts) @ {slab.halfRate}% on Amount {formatInr(partsAmt)}</span>
                                    <span className="font-bold">{formatInr(sgstParts)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-800">
                                    <span>CGST(Labour) @ {slab.halfRate}% on Amount {formatInr(labourAmt)}</span>
                                    <span className="font-bold">{formatInr(cgstLabour)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-800">
                                    <span>SGST(Labour) @ {slab.halfRate}% on Amount {formatInr(labourAmt)}</span>
                                    <span className="font-bold">{formatInr(sgstLabour)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {(() => {
                            const { grandTaxable, grandTax, grandGross } = calculateAllSlabsTotal();
                            return (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs bg-slate-100/80 p-2.5 rounded-xl">
                                <div className="space-y-0.5">
                                  <div className="text-[11px] text-slate-600 font-medium">
                                    Combined Taxable: <strong className="font-mono text-slate-800">₹{formatInr(grandTaxable)}</strong> | Total GST: <strong className="font-mono text-slate-800">₹{formatInr(grandTax)}</strong>
                                  </div>
                                  <div className="text-xs font-black text-slate-900">
                                    Combined Gross Amount: <strong className="text-indigo-700 font-mono text-sm">₹{formatInr(grandGross)}</strong>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (grandGross > 0) {
                                      setBillAmount(grandGross.toFixed(2));
                                    }
                                  }}
                                  disabled={grandGross <= 0}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Apply Combined to Bill Amount</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Bill Amount (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm sm:text-base">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          placeholder="Enter total invoice amount e.g. 2000"
                          value={billAmount}
                          onChange={(e) => setBillAmount(e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className="w-full h-11 pl-8 sm:pl-9 pr-4 py-2 text-sm sm:text-base font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Receipt / Invoice No *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. REC-2026-081"
                          value={receiptNo}
                          onChange={(e) => setReceiptNo(e.target.value)}
                          className="w-full h-10 px-3 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Job Card <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. JC-2026-081"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full h-10 px-3 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Dealership Branch
                          </label>
                          {isBranchAutoSelected && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Auto-selected ({currentUser?.branch_name ? `${currentUser.branch_name}` : currentUser?.username ? `${currentUser.username} counter` : 'Staff profile'})
                            </span>
                          )}
                        </div>
                        <select
                          value={String(branchId || '')}
                          onChange={(e) => setBranchId(Number(e.target.value) || e.target.value)}
                          className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                        >
                          {branches.map((b) => {
                            const bid = String(b.id || b.branch_id);
                            return (
                              <option key={bid} value={bid}>
                                {b.name || b.branch_name}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 5. Live Auto-Calculation Breakdown Strip */}
                  {numAmount > 0 && (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      {isEligible && activeRedeemPoints > 0 ? (
                        <div className="bg-emerald-50/80 border-b border-emerald-200 p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-950 font-bold flex-wrap">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Auto Loyalty Discount Applied (4 PTS = ₹1)</span>
                            {modelCapPercent < 100 && (
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                                {modelCapPercent}% {selectedVeh?.model || 'Model'} Cap Enforced
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                            - {activeRedeemPoints} PTS (- ₹{discountAmount})
                          </span>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border-b border-slate-200 p-2.5 text-xs text-slate-600 font-medium">
                          No points redeemed for this invoice. New points will be earned on full amount.
                        </div>
                      )}

                      <div className="p-3.5 bg-white space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Total Bill:</span>
                          <span className="font-mono font-bold text-slate-900">₹{numAmount.toLocaleString('en-IN')}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center text-emerald-700 font-semibold">
                            <span>Points Discount ({activeRedeemPoints} PTS):</span>
                            <span className="font-mono font-bold">- ₹{discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-900 font-black pt-1 border-t border-slate-100">
                          <span>Net Cash to Collect:</span>
                          <span className="font-mono text-sm text-indigo-700 font-bold">₹{netCashPaid.toLocaleString('en-IN')}</span>
                        </div>
                        {category !== 'sale' && effectiveTaxableAmount > 0 && (
                          <div className="flex justify-between items-center text-slate-500 text-[11px] bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <span>Pre-Tax Base / Net Taxable:</span>
                            <span className="font-mono font-medium text-slate-700">
                              ₹{formatInr(effectiveTaxableAmount)} {discountAmount > 0 ? `→ ₹${formatInr(netTaxableSpend)}` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-500" /> New Points to Earn:
                          </span>
                          <span className="font-mono font-black text-amber-600">+{earnedPoints} PTS</span>
                        </div>
                        {category !== 'sale' && netTaxableSpend > 0 && (
                          <div className="text-[10px] text-slate-400 text-right -mt-1 font-medium">
                            (Calculated on pre-tax net: ₹{formatInr(netTaxableSpend)} @ {rateMultiplier} PTS / ₹100)
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-500 pt-1 text-[11px]">
                          <span>Projected New Balance:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {projectedBalance} PTS (≈ ₹{(projectedBalance * 0.25).toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Sticky Pinned Action Footer */}
                <div className="flex-shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 px-4 sm:px-6 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
                  {isAdvisor ? (
                    <div className="text-center py-1">
                      <span className="text-xs font-bold text-slate-500">
                        Advisor Role: Invoices dropped on the left appear in the Cashier counter queue.
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="submit"
                        disabled={isSubmitting || numAmount <= 0}
                        className={`w-full min-h-[46px] py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                          isEligible && activeRedeemPoints > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Processing Receipt &amp; Updating Ledger...
                          </>
                        ) : isEligible && activeRedeemPoints > 0 ? (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
                            <span className="truncate">
                              Confirm Receipt &amp; Redeem {activeRedeemPoints} PTS (- ₹{discountAmount})
                            </span>
                            <span className="text-emerald-200 ml-1">→</span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-4 h-4 text-amber-200 shrink-0" />
                            <span className="truncate">
                              Confirm &amp; Record Receipt (+{earnedPoints} PTS)
                            </span>
                            <span className="text-indigo-200 ml-1">→</span>
                          </>
                        )}
                      </button>
                      {numAmount <= 0 && (
                        <p className="text-[10px] text-center text-slate-400 font-medium mt-1">
                          Select an invoice from queue or enter invoice details above to record receipt
                        </p>
                      )}
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddReceiptModal;
