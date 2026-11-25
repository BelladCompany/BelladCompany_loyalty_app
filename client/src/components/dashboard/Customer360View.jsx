import React, { useState, useEffect } from 'react';
import { CustomerSummaryCard, DataTable, StatCard, CopyButton } from '../ui';
import {
  Car,
  History,
  PlusCircle,
  Phone,
  Mail,
  Calendar,
  Store,
  MapPin,
  Lock,
  Clock,
  ShieldOff,
  Users,
  UserCheck,
  Tag,
  Coins,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Wrench,
  Package,
  UploadCloud,
} from 'lucide-react';
import EarnPointsModal from './EarnPointsModal';
import RedemptionModal from './RedemptionModal';
import AddReceiptModal from './AddReceiptModal';
import RaiseCorrectionModal from './RaiseCorrectionModal';
import ViewCorrectionModal from './ViewCorrectionModal';
import ApiService from '../../services/api';

export const Customer360View = ({
  customer,
  ledgerData = [],
  tierInfo,
  onRefresh,
  branches = [],
  user,
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState('ledger');
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedCorrectionRef, setSelectedCorrectionRef] = useState('');
  const [selectedCorrectionAmount, setSelectedCorrectionAmount] = useState('');
  const [customerCorrections, setCustomerCorrections] = useState([]);
  const [viewCorrectionData, setViewCorrectionData] = useState(null);
  const [earnModalOpen, setEarnModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [vehicleStatuses, setVehicleStatuses] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // V2 Customer Spare Parts State
  const [customerSpareParts, setCustomerSpareParts] = useState([]);
  const [isLoadingSpareParts, setIsLoadingSpareParts] = useState(false);
  const [sparePartsFilter, setSparePartsFilter] = useState('all');

  useEffect(() => {
    if (!customer?.customer_id) return;
    setIsLoadingSpareParts(true);
    ApiService.getCustomerSparePartsV2(customer.customer_id)
      .then((res) => {
        setCustomerSpareParts(res.data || []);
      })
      .catch((err) => {
        console.warn('Failed to load customer spare parts:', err);
        setCustomerSpareParts([]);
      })
      .finally(() => {
        setIsLoadingSpareParts(false);
      });
  }, [customer?.customer_id, ledgerData]);

  // Helper to extract bill amount from ledger row
  const getRowBillAmount = (row) => {
    if (!row) return '';
    if (row.amount_paise && Number(row.amount_paise) > 0) return String(Number(row.amount_paise) / 100);
    if (row.calc_snapshot?.bill_amount) return String(row.calc_snapshot.bill_amount);
    if (row.calc_snapshot?.net_ex_showroom) return String(row.calc_snapshot.net_ex_showroom);
    if (row.calc_snapshot?.amount_paise) return String(Number(row.calc_snapshot.amount_paise) / 100);
    const match = String(row.reference_id || row.source_ref || '').match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    if (match) return match[1].replace(/,/g, '');
    const numPts = Math.abs(Number(row.points || 0));
    if (numPts > 0) {
      const catStr = String(row.transaction_category || row.transaction_type || row.type || '').toLowerCase();
      const rate = catStr.includes('access') ? 2 : catStr.includes('bodyshop') ? 3 : 4;
      return String(Math.round((numPts / rate) * 100));
    }
    return '';
  };
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const isAdvisor = user?.role === 'advisor';
  const [advisorViewOnlyNotice, setAdvisorViewOnlyNotice] = useState(false);

  const handleOpenCorrection = (row) => {
    if (isAdvisor) {
      setAdvisorViewOnlyNotice(true);
      return;
    }
    if (row) {
      setSelectedCorrectionRef(row.receipt_no || row.reference_id || String(row.id || row.entry_id || ''));
      setSelectedCorrectionAmount(getRowBillAmount(row));
    } else {
      setSelectedCorrectionRef('');
      setSelectedCorrectionAmount('');
    }
    setCorrectionModalOpen(true);
  };

  // Central refresh logic for customer profile, ledger, and billing corrections
  const handleRefreshProfile = async (silent = false) => {
    if (!customer?.customer_id) return;
    if (!silent) setIsRefreshing(true);
    try {
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
      const res = await ApiService.getCorrectionRequests('all', customer.customer_id);
      const list = res.data || [];
      const userCorrections = list.filter((r) => r.customer_id === customer.customer_id);
      setCustomerCorrections(userCorrections);

      // Refresh vehicles status if any
      const vehicles = customer?.vehicles || [];
      if (vehicles.length > 0) {
        vehicles.forEach((v) => {
          const vid = v.id || v.vehicle_id;
          if (!vid) return;
          ApiService.getVehicleRedemptionStatus(vid)
            .then((vRes) => {
              setVehicleStatuses((prev) => ({ ...prev, [vid]: vRes.data }));
            })
            .catch(() => {});
        });
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('Customer profile refresh failed:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Fetch all correction requests for customer on initial load or ledger change
  useEffect(() => {
    if (!customer?.customer_id) return;
    ApiService.getCorrectionRequests('all', customer.customer_id)
      .then((res) => {
        const list = res.data || [];
        const userCorrections = list.filter((r) => r.customer_id === customer.customer_id);
        setCustomerCorrections(userCorrections);
      })
      .catch(() => setCustomerCorrections([]));
  }, [customer?.customer_id, ledgerData]);

  // Smart polling: Auto-check for updates every 8 seconds if there are pending correction tickets
  useEffect(() => {
    const hasPending = customerCorrections.some((c) => c.status === 'pending');
    if (!hasPending || !customer?.customer_id) return;

    const intervalId = setInterval(() => {
      handleRefreshProfile(true);
    }, 8000);

    return () => clearInterval(intervalId);
  }, [customerCorrections, customer?.customer_id]);

  // Auto-refresh when cashier focuses back on the window
  useEffect(() => {
    const handleFocus = () => {
      if (customer?.customer_id) {
        handleRefreshProfile(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [customer?.customer_id]);

  // Strict matcher to link ledger rows with their exact correction ticket
  // Guarantees ONLY that particular receipt number gets the status!
  const getCorrectionForRow = (row) => {
    if (!row || !customerCorrections.length) return null;
    const rowReceipt = String(row.receipt_no || '').trim().toLowerCase();
    const rowEntryId = String(row.id || row.entry_id || '').trim();

    if (!rowReceipt && !rowEntryId) return null;

    return customerCorrections.find((c) => {
      const cRef = String(c.points_ledger_reference || '').trim().toLowerCase();
      if (!cRef) return false;
      // Exact match on receipt_no
      if (rowReceipt && cRef === rowReceipt) return true;
      // Exact match on entry_id
      if (rowEntryId && (cRef === rowEntryId || cRef === `#${rowEntryId}`)) return true;
      return false;
    });
  };

  // Fetch redemption status for every vehicle when customer profile loads
  useEffect(() => {
    const vehicles = customer?.vehicles || [];
    if (vehicles.length === 0) return;

    vehicles.forEach((v) => {
      const vid = v.id || v.vehicle_id;
      if (!vid) return;
      ApiService.getVehicleRedemptionStatus(vid)
        .then((res) => {
          setVehicleStatuses((prev) => ({ ...prev, [vid]: res.data }));
        })
        .catch(() => {});
    });
  }, [customer?.customer_id, ledgerData]);

  if (!customer) return null;

  const currentBalance = Math.max(0, tierInfo?.current_balance ?? customer.current_balance ?? customer.points_balance ?? 0);
  const tierName = tierInfo?.tier_name || customer.tier_name || 'Silver';
  const rupeeValue = Math.max(0, Math.floor(currentBalance / 4));

  // Redemptions filtered from ledger
  const redemptionsList = ledgerData.filter(
    (item) => item.type === 'redemption' || item.transaction_type === 'redemption' || item.points < 0
  );

  // Filtered customer spare parts
  const filteredSpareParts = customerSpareParts.filter((item) => {
    if (sparePartsFilter === 'all') return true;
    return item.item_type === sparePartsFilter;
  });

  // Columns for Points Ledger Table
  const ledgerColumns = [
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      align: 'left',
      cellClassName: 'font-mono text-xs text-slate-500',
    },
    {
      field: 'transaction_type',
      header: 'Transaction Type',
      sortable: true,
      render: (val, row) => {
        let label = val;
        let colorClass = 'bg-slate-100 text-slate-800 border-slate-300';
        
        const refStr = (row.reference_id || row.source_ref || '').toLowerCase();
        const reasonStr = (row.reason_text || '').toLowerCase();
        const cat = String(row?.transaction_category || '').toLowerCase();
        const tType = String(val || row?.type || '').toLowerCase();

        if (row.source_type === 'CAMPAIGN' || row.reason_type === 'campaign_bonus') {
          label = '🎉 Campaign Add-on Bonus';
          colorClass = 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold';
        } else if (refStr.includes('gift card') || reasonStr.includes('gift card') || row.reason_type === 'gift_card_claim') {
          label = '🎁 Gift Card Claim';
          colorClass = 'bg-purple-50 text-purple-900 border-purple-300 font-extrabold';
        } else if (refStr.includes('finance') || reasonStr.includes('finance')) {
          label = '🏦 In-house Finance';
          colorClass = 'bg-emerald-50 text-emerald-900 border-emerald-300 font-extrabold';
        } else if (refStr.includes('insurance') || reasonStr.includes('insurance')) {
          label = '🛡️ In-house Insurance';
          colorClass = 'bg-blue-50 text-blue-900 border-blue-300 font-extrabold';
        } else if (refStr.includes('exchange') || reasonStr.includes('exchange')) {
          label = '🔄 In-house Exchange';
          colorClass = 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold';
        } else if (refStr.includes('in-house') || reasonStr.includes('in-house')) {
          label = '✨ In-house Bonus';
          colorClass = 'bg-teal-50 text-teal-900 border-teal-300 font-extrabold';
        } else if (tType === 'sale' || tType === 'earn_sale' || cat === 'sale') {
          label = '🚗 Vehicle Sale (After Disc)';
          colorClass = 'bg-sky-50 text-sky-900 border-sky-300 font-bold';
        } else if (tType === 'service' || tType === 'earn_service' || cat === 'service' || (tType === 'earn' && cat === 'service')) {
          label = '🔧 Workshop Service';
          colorClass = 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold';
        } else if (tType === 'bodyshop' || tType === 'earn_bodyshop' || cat === 'bodyshop' || (tType === 'earn' && cat === 'bodyshop')) {
          label = '🛠️ Bodyshop & Repairs';
          colorClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
        } else if (tType.includes('access') || cat.includes('access') || (tType === 'earn' && cat.includes('access'))) {
          label = '📦 Genuine Accessories';
          colorClass = 'bg-violet-50 text-violet-900 border-violet-300 font-bold';
        } else if (tType === 'earn_referral' || tType === 'referral' || cat === 'referral') {
          label = '👥 Referral Reward';
          colorClass = 'bg-pink-50 text-pink-900 border-pink-300 font-bold';
        } else if (tType === 'redemption' || tType === 'redeem' || cat === 'redemption' || Number(row?.points || 0) < 0) {
          label = '🏷️ Redemption (Discount)';
          colorClass = 'bg-rose-50 text-rose-950 border-rose-300 font-bold';
        } else if (tType === 'expire') {
          label = 'Expired (Forfeited)';
          colorClass = 'bg-gray-200 text-gray-600 border-gray-400 font-bold';
        } else if (tType === 'adjust' || tType === 'manual_adjustment' || tType === 'correction_applied' || tType === 'correction_reversal') {
          label = '⚖️ Points Correction';
          colorClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
        } else {
          label = val;
        }

        return (
          <span className={`inline-block px-2.5 py-1 text-xs uppercase tracking-wider rounded border ${colorClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      field: 'points',
      header: 'Points',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={`font-bold font-mono text-sm ${val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {val > 0 ? `+${Number(val).toLocaleString()}` : Number(val).toLocaleString()}
        </span>
      ),
    },
    {
      field: 'points',
      header: 'Amount Balance (₹)',
      sortable: true,
      align: 'right',
      render: (pts, row) => {
        const numPts = Number(pts || 0);
        // In Bellad & Company Loyalty: 4 Points = ₹1.00
        const amountVal = Math.abs(numPts) / 4;
        const formattedAmount = amountVal.toLocaleString('en-IN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });

        // Determine recorded bill amount from calc_snapshot, amount_paise, or source_ref
        const isBonusRow = row?.source_type === 'CAMPAIGN' || row?.reason_type === 'campaign_bonus';
        let billAmount = null;

        if (!isBonusRow) {
          if (row.amount_paise && Number(row.amount_paise) > 0) {
            billAmount = Number(row.amount_paise) / 100;
          } else if (row.calc_snapshot?.bill_amount) {
            billAmount = Number(row.calc_snapshot.bill_amount);
          } else if (row.calc_snapshot?.net_ex_showroom) {
            billAmount = Number(row.calc_snapshot.net_ex_showroom);
          } else if (row.calc_snapshot?.amount_paise) {
            billAmount = Number(row.calc_snapshot.amount_paise) / 100;
          } else {
            const match = String(row.reference_id || row.source_ref || '').match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
            if (match) {
              billAmount = parseFloat(match[1].replace(/,/g, ''));
            } else if (numPts > 0) {
              // Precise fallback calculation based on category earning rate
              const catStr = String(row?.transaction_category || row?.transaction_type || row?.type || '').toLowerCase();
              const rate = catStr.includes('access') ? 2 : catStr.includes('bodyshop') ? 3 : 4;
              billAmount = Math.round((numPts / rate) * 100);
            }
          }
        }

        return (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`font-mono font-bold text-xs sm:text-sm ${
                numPts < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {numPts > 0 ? `+₹${formattedAmount}` : numPts < 0 ? `-₹${formattedAmount}` : `₹0`}
            </span>
            {billAmount && billAmount > 0 && (
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                Bill: ₹{billAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'reference_id',
      header: 'Reference & Details',
      sortable: true,
      render: (val, row) => {
        if (!val && !row?.receipt_no && !row?.source_ref) return '—';

        // 1. Extract clean Receipt Number / Reference Code
        let receiptNo = row?.receipt_no;
        const rawStr = String(val || row?.source_ref || '').trim();

        if (!receiptNo) {
          const recMatch = rawStr.match(/Rec-[A-Za-z0-9_-]+/i) || rawStr.match(/INV-[A-Za-z0-9_-]+/i);
          if (recMatch) {
            receiptNo = recMatch[0];
          } else if (rawStr.includes('PR Done Sales Sync:')) {
            receiptNo = rawStr.replace('PR Done Sales Sync:', '').trim();
          } else {
            const first = rawStr.split(' | ')[0].replace(/^Receipt:\s*/i, '').trim();
            receiptNo = first || rawStr;
          }
        }

        // 2. Extract clean Type (Service, Accessories, Sale, Redemption, Spares, Bodyshop)
        const cat = String(row?.transaction_category || row?.transaction_type || row?.type || '').toLowerCase();
        let typeBadge = '';
        if (cat.includes('service')) typeBadge = 'Service';
        else if (cat.includes('access')) typeBadge = 'Accessories';
        else if (cat.includes('spares') || cat.includes('part')) typeBadge = 'Spares';
        else if (cat.includes('bodyshop')) typeBadge = 'Bodyshop';
        else if (cat.includes('sale') || cat.includes('purchase')) typeBadge = 'Sale';
        else if (cat.includes('redemption') || Number(row?.points || 0) < 0) typeBadge = 'Redemption';
        else {
          const rawLower = rawStr.toLowerCase();
          if (rawLower.includes('service')) typeBadge = 'Service';
          else if (rawLower.includes('access')) typeBadge = 'Accessories';
          else if (rawLower.includes('spares')) typeBadge = 'Spares';
          else if (rawLower.includes('bodyshop')) typeBadge = 'Bodyshop';
          else if (rawLower.includes('sale')) typeBadge = 'Sale';
          else if (rawLower.includes('redemption')) typeBadge = 'Redemption';
          else typeBadge = 'Service';
        }

        const isBonus = row?.source_type === 'CAMPAIGN' || row?.reason_type === 'campaign_bonus';

        if (isBonus) {
          const campName = row.campaign_name || 'Campaign Bonus';
          const bonusPts = Number(row.points || 0);
          let pctText = row.campaign_value ? `${Number(row.campaign_value)}%` : '';
          if (!pctText && row.reason_text) {
            const m = row.reason_text.match(/(\d+(?:\.\d+)?%)/);
            if (m) pctText = m[1];
          }

          return (
            <div className="flex flex-col gap-1 items-start">
              {receiptNo && (
                <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">{receiptNo}</span>
              )}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-950 border border-amber-300 font-bold text-xs whitespace-nowrap shadow-2xs"
                title={receiptNo ? `Ref Invoice: ${receiptNo}` : undefined}
              >
                <span>🎁 {campName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 font-extrabold">+{bonusPts.toLocaleString('en-IN')} pts</span>
                {pctText && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-700 font-extrabold">({pctText})</span>
                  </>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">{receiptNo}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              {typeBadge}
            </span>
          </div>
        );
      },
    },
    {
      field: 'branch_name',
      header: 'Branch / Cashier',
      sortable: true,
      render: (val, row) => (
        <div className="text-xs font-medium">
          <div className="text-slate-900 font-semibold">{val || 'Main Showroom'}</div>
          {row.created_by_username && <div className="text-[11px] text-slate-500">by {row.created_by_username}</div>}
        </div>
      ),
    },
    {
      field: 'created_at',
      header: 'Date & Time',
      sortable: true,
      render: (val) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(val).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Action / Status',
      align: 'right',
      render: (_, row) => {
        if (row.type === 'expire' || row.type === 'correction_reversal' || row.type === 'correction_applied') return null;

        const rowCorrection = getCorrectionForRow(row);
        const status = rowCorrection?.status;

        if (status === 'pending') {
          return (
            <div className="flex flex-col items-end gap-1 min-w-[140px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 rounded-md border border-amber-300 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                Sent to Correction
              </span>
              <div className="text-[10px] text-amber-800 font-semibold font-mono flex items-center gap-1">
                <span className="line-through text-slate-500">₹{Number(rowCorrection.wrong_bill_amount || 0).toLocaleString('en-IN')}</span>
                <span>➔</span>
                <span className="font-bold text-amber-950">₹{Number(rowCorrection.correct_bill_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewCorrectionData(rowCorrection)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded border border-amber-400 transition cursor-pointer"
                title="View correction request details"
              >
                <Eye className="w-3 h-3 text-amber-800" />
                View Details
              </button>
            </div>
          );
        }

        if (status === 'approved') {
          return (
            <div className="flex flex-col items-end gap-1 min-w-[140px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-900 bg-emerald-100 rounded-md border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Approved
              </span>
              <div className="text-[10px] text-emerald-800 font-semibold font-mono flex items-center gap-1">
                <span className="line-through text-slate-400">₹{Number(rowCorrection.wrong_bill_amount || 0).toLocaleString('en-IN')}</span>
                <span>➔</span>
                <span className="font-bold text-emerald-950">₹{Number(rowCorrection.correct_bill_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewCorrectionData(rowCorrection)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-900 bg-emerald-200/80 hover:bg-emerald-300 rounded border border-emerald-400 transition cursor-pointer"
                title="View manager approval statement"
              >
                <Eye className="w-3 h-3 text-emerald-800" />
                View Statement
              </button>
            </div>
          );
        }

        if (status === 'rejected') {
          return (
            <div className="flex flex-col items-end gap-1 min-w-[150px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-900 bg-rose-100 rounded-md border border-rose-300 shadow-2xs">
                <XCircle className="w-3.5 h-3.5 text-rose-700" />
                Rejected
              </span>
              <div className="text-[10px] text-rose-800 font-semibold font-mono flex items-center gap-1">
                <span className="line-through text-slate-400">₹{Number(rowCorrection.wrong_bill_amount || 0).toLocaleString('en-IN')}</span>
                <span>➔</span>
                <span className="font-bold text-rose-950">₹{Number(rowCorrection.correct_bill_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={() => setViewCorrectionData(rowCorrection)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-rose-900 bg-rose-200/80 hover:bg-rose-300 rounded border border-rose-400 transition cursor-pointer"
                  title="View manager rejection reason"
                >
                  <Eye className="w-3 h-3 text-rose-800" />
                  View Note
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCorrection(row)}
                  className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-700 hover:bg-rose-800 rounded transition cursor-pointer shadow-xs"
                  title="Re-validate & re-submit correction"
                >
                  Re-validate
                </button>
              </div>
            </div>
          );
        }

        if (isAdvisor) {
          return <span className="text-[11px] font-medium text-slate-400 italic">View Only</span>;
        }

        return (
          <button
            type="button"
            onClick={() => handleOpenCorrection(row)}
            className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-300 shadow-xs cursor-pointer transition"
            title="Raise bill correction for this transaction"
          >
            Bill Correction
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Advisor View-Only Notice Banner */}
      {isAdvisor && (
        <div className="p-3 sm:p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-sky-900 gap-2 font-medium shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              ADV
            </div>
            <div>
              <span className="font-bold text-sky-950 block">Advisor View-Only Mode</span>
              <span className="text-[11px] text-sky-800">
                You have view-only access to customer profiles and points balance. To upload single or bulk invoice PDFs, use the dedicated "Upload Invoices" tab in the left sidebar.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-sky-800 px-2.5 py-1 rounded-full border border-sky-300 shrink-0">
            View Only
          </span>
        </div>
      )}

      {/* 1. Customer Summary Card Header */}
      <CustomerSummaryCard
        customer={{
          ...customer,
          points_balance: currentBalance,
          tier_name: tierName,
        }}
        onAddReceipt={isAdvisor ? null : () => setAddReceiptModalOpen(true)}
        onRefresh={() => handleRefreshProfile(false)}
        isRefreshing={isRefreshing}
        hasPendingCorrection={customerCorrections.some((c) => c.status === 'pending')}
      />

      {/* 2. Key Metrics Glanceable Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          label="Available Point Balance"
          value={`${Number(currentBalance).toLocaleString()} PTS`}
          subtext={`≈ ₹${Number(rupeeValue).toLocaleString()} in direct discount`}
          variant="default"
        />
        <StatCard
          label="Current Membership Tier"
          value={tierName}
          subtext={`${tierInfo?.tier_multiplier || 100}% points earning rate`}
          variant="default"
        />
        <StatCard
          label="Registered Vehicles"
          value={`${(customer.vehicles || []).length} Vehicle${(customer.vehicles || []).length === 1 ? '' : 's'}`}
          subtext="Linked across all dealership brands"
          variant="default"
        />
      </div>

      {/* 3. Detailed Customer Master Profile Card (Hidden for now as requested - identity, Aadhaar, and phone details are already shown in CustomerSummaryCard above. Code preserved.) */}
      {false && (
        <section className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3.5 sm:space-y-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <UserCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight">
                Customer Master Details
              </h3>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider shrink-0 whitespace-nowrap leading-none">
              PR Status: {customer.pr_status || customer.billing_status || 'PR Done'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Customer Name</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block break-words select-text">{customer.name || customer.customer_name || 'N/A'}</span>
                {(customer.name || customer.customer_name) && <CopyButton text={customer.name || customer.customer_name} size="xs" title="Copy Customer Name" />}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Registered Phone</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block break-words select-text">
                  {(customer.phones || []).map((p) => p.phone_number || p).join(', ') || 'N/A'}
                </span>
                {(customer.phones || []).length > 0 && <CopyButton text={(customer.phones || []).map((p) => p.phone_number || p).join(', ')} size="xs" title="Copy Phone Number" />}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                {customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 ? 'Aadhaar Card No' : customer.gst_number || customer.gstin ? 'GSTIN (Commercial)' : 'Aadhaar / GSTIN'}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block break-words select-text">
                  {customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 || customer.gst_number || customer.gstin || 'N/A'}
                </span>
                {(customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 || customer.gst_number || customer.gstin) && (
                  <CopyButton text={customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 || customer.gst_number || customer.gstin} size="xs" title="Copy Identity" />
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Age</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block">{customer.age ? `${customer.age} Years` : 'N/A'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Firm Name</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block break-words">{customer.firm || customer.firm_name || 'N/A'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Branch Name</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block break-words">{customer.branch || customer.branch_name || 'Main Branch'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">DMS Invoice Date</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block break-words">{customer.dms_invoice_date || customer.dms_inv_date || 'N/A'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 min-w-0 col-span-2 sm:col-span-2 lg:col-span-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Customer Address</span>
              <span className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 block break-words">{customer.address || 'N/A'}</span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Prominent Vehicle Details Block */}
      <section className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3.5 sm:space-y-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Car className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight">
              Vehicle Specifications &amp; Pricing
            </h3>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 whitespace-nowrap">
            {(customer.vehicles || []).length} Vehicle(s)
          </span>
        </div>

        {(customer.vehicles || []).length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-sm font-medium">
            No vehicles registered yet for this customer profile.
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {customer.vehicles.map((v, idx) => {
              const vid = v.id || v.vehicle_id;
              const vs = vehicleStatuses[vid];
              const grossPrice = Number(v.gross_ex_showroom_price || (v.ex_showroom_price_paise ? v.ex_showroom_price_paise / 100 : v.ex_showroom_price) || 0);
              const dealerDisc = Number(v.dealer_cash_discount || 0);
              const empsDisc = Number(v.emps_discount || 0);
              const oemOffers = Number(v.oem_offers_amount || 0);

              const netPrice = v.net_ex_showroom_price != null 
                ? Number(v.net_ex_showroom_price)
                : Math.max(0, grossPrice - dealerDisc - empsDisc - oemOffers);

              const isPreApril2026 = v.purchase_date && new Date(v.purchase_date) < new Date('2026-04-01');

              return (
                <div
                  key={vid || idx}
                  className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 sm:p-4 space-y-3 hover:border-amber-500 transition shadow-xs w-full"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono font-extrabold text-xs bg-white px-2.5 py-1 border border-slate-300 rounded-lg text-slate-900 shadow-2xs inline-flex items-center gap-1 select-text">
                        <span>Reg No: {v.registration_number || v.reg_no || v.vin || v.chassis_no || 'N/A'}</span>
                        <CopyButton text={v.registration_number || v.reg_no || v.vin || v.chassis_no || ''} size="xs" title="Copy Registration No" />
                      </span>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-900 border border-amber-500/30">
                        {v.brand_name || v.brand || 'Vehicle'}
                      </span>
                      {isPreApril2026 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300">
                          Pre-April 2026 (No Sales Points)
                        </span>
                      )}
                    </div>

                    {vs && (
                      <span
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] sm:text-xs uppercase whitespace-nowrap ${
                          vs.status === 'eligible'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {vs.status === 'eligible'
                          ? 'Eligible (Points Never Expire)'
                          : '12M Lock (Accessories Unlocked)'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5 text-xs">
                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">VIN / Chassis No</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block break-all leading-snug select-text">{v.vin || v.chassis_no || 'N/A'}</span>
                        <CopyButton text={v.vin || v.chassis_no || ''} size="xs" title="Copy VIN / Chassis" />
                      </div>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Model Name</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block break-words leading-snug">{v.model || 'Unspecified'}</span>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Variant</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block break-words leading-snug">{v.variant || v.varient || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Fuel Type</span>
                      <span className="font-bold text-blue-900 text-xs mt-0.5 uppercase block leading-snug">{v.fuel_type || 'Petrol / Diesel / EV'}</span>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Firm Name</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block break-words leading-snug">{v.firm_name || v.firm || customer.firm || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">DMS Invoice Date</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block break-words leading-snug">{v.dms_invoice_date || customer.dms_invoice_date || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Gross Ex-Showroom</span>
                      <span className="font-extrabold text-slate-800 text-xs mt-0.5 block leading-snug">{grossPrice > 0 ? `₹${grossPrice.toLocaleString('en-IN')}` : 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-rose-200 bg-rose-50/40 min-w-0">
                      <span className="text-rose-700 block text-[10px] uppercase font-bold tracking-wider">Discounts</span>
                      <span className="font-extrabold text-rose-700 text-xs mt-0.5 block leading-snug">
                        {grossPrice - netPrice > 0 ? `−₹${(grossPrice - netPrice).toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 sm:p-3 rounded-lg border-2 border-emerald-400 bg-emerald-50/60 col-span-2 sm:col-span-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div>
                          <span className="text-emerald-900 block text-[10px] uppercase font-extrabold tracking-wider">
                            Net Ex-Showroom (After Discount)
                          </span>
                          <span className="font-black text-emerald-800 text-base sm:text-lg">
                            {netPrice > 0 ? `₹${netPrice.toLocaleString('en-IN')}` : 'N/A'}
                          </span>
                        </div>
                        <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                          Points Base: +{Math.floor(netPrice / 100).toLocaleString('en-IN')} PTS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Redemption Clock Status message */}
                  {vs && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-600 font-semibold">{vs.message}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Tabbed Customer Profile History (Ledger / Redemptions) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-5 sm:space-y-6 shadow-card">
        {/* Navigation Tabs (Smart CRM pill style) */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-100 overflow-x-auto pb-3 -mx-1 px-1">
          {[
            { id: 'ledger', label: 'Points Ledger', icon: History },
            { id: 'redemptions', label: 'Redemptions', icon: Coins },
            { id: 'spare_parts', label: `Spare Parts & Invoices (${customerSpareParts.length})`, icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeProfileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-black rounded-xl sm:rounded-2xl transition whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Points Ledger */}
        {activeProfileTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Transaction Audit Trail ({ledgerData.length} entries)
                </h4>
                {lastRefreshedAt && (
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    (Updated {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRefreshProfile(false)}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                  title="Refresh customer profile, transaction audit trail, and correction statuses"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                {!isAdvisor && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAddReceiptModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-white" />
                      Add Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCorrection(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                      title="Raise bill correction if wrong bill or amount was entered by mistake"
                    >
                      <FileText className="w-3.5 h-3.5 text-white" />
                      Bill Correction
                    </button>
                  </>
                )}
              </div>
            </div>

            <DataTable
              columns={ledgerColumns}
              data={ledgerData}
              keyField="id"
              emptyMessage="No transaction ledger history recorded for this customer yet."
            />
          </div>
        )}

        {/* Tab 2: Redemptions */}
        {activeProfileTab === 'redemptions' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Redemption Transactions</h4>
            {redemptionsList.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                No points redemption transactions recorded yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Transaction Date</th>
                      <th className="p-3 text-right">Points Redeemed</th>
                      <th className="p-3 text-right">Discount Applied</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redemptionsList.map((red, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-700">{new Date(red.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">{Math.abs(red.points)} PTS</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          ₹{Math.floor(Math.abs(red.points) / 4)}
                        </td>
                        <td className="p-3 font-mono text-slate-800">{red.reference_id || '—'}</td>
                        <td className="p-3 text-slate-700">{red.branch_name || 'Main Showroom'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Spare Parts & Service Invoices Table */}
        {activeProfileTab === 'spare_parts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Spare Parts &amp; Service Invoices ({filteredSpareParts.length} line items)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Itemized spare parts, HSN codes, unit prices, discounts, GST breakdown, and invoice links recorded for {customer.name || customer.customer_name}.
                </p>
              </div>

              {/* Filter: All / Parts Only / Labour Only */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSparePartsFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    sparePartsFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({customerSpareParts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSparePartsFilter('part')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    sparePartsFilter === 'part' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Parts ({customerSpareParts.filter(i => i.item_type === 'part').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSparePartsFilter('labour')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    sparePartsFilter === 'labour' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Labour ({customerSpareParts.filter(i => i.item_type === 'labour').length})
                </button>
              </div>
            </div>

            {isLoadingSpareParts ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Loading spare parts history...
              </div>
            ) : filteredSpareParts.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No spare parts recorded yet for this customer.</p>
                <p className="text-[11px] text-slate-500">
                  When service invoices are uploaded via "Add Receipt", parts &amp; prices are automatically cataloged here.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Part / Op Code</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-3 text-center">HSN/SAC</th>
                      <th className="py-3 px-2 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-3 px-3 text-right">Discount (₹)</th>
                      <th className="py-3 px-3 text-right">Taxable (₹)</th>
                      <th className="py-3 px-3 text-center">GST %</th>
                      <th className="py-3 px-3 text-right font-black">Total (₹)</th>
                      <th className="py-3 px-3">Invoice &amp; Vehicle</th>
                      <th className="py-3 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredSpareParts.map((item, idx) => {
                      const totalGstPercent = (Number(item.cgst_rate_percent || 0) + Number(item.sgst_rate_percent || 0));
                      const isPart = item.item_type === 'part';
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              isPart ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {isPart ? 'Part' : 'Labour'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap select-text">
                            {item.item_code || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-xs truncate" title={item.item_description}>
                            {item.item_description}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 text-center whitespace-nowrap">
                            {item.hsn_sac_code || '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 whitespace-nowrap">
                            {item.quantity} {item.uom ? <span className="text-[9px] text-slate-400">{item.uom}</span> : ''}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                            ₹{Number(item.unit_rate_rupees).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600 whitespace-nowrap">
                            {Number(item.discount_rupees) > 0 ? `-₹${Number(item.discount_rupees).toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            ₹{Number(item.taxable_value_rupees).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                              {totalGstPercent > 0 ? `${totalGstPercent}%` : '0%'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap text-xs">
                            ₹{Number(item.total_amount_rupees).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono text-xs font-bold text-indigo-700 select-text">{item.invoice_number || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {item.registration_number ? `${item.registration_number}` : ''}
                              {item.vehicle_model ? ` (${item.vehicle_model})` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.invoice_date ? new Date(item.invoice_date).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal Dialogs */}
      <AddReceiptModal
        isOpen={addReceiptModalOpen}
        customer={{
          ...customer,
          points_balance: currentBalance,
        }}
        branches={branches}
        user={user}
        onClose={() => setAddReceiptModalOpen(false)}
        onSuccess={() => handleRefreshProfile(false)}
      />

      <RaiseCorrectionModal
        isOpen={correctionModalOpen}
        initialCustomerId={customer?.customer_id}
        initialReference={selectedCorrectionRef}
        initialWrongAmount={selectedCorrectionAmount}
        ledgerData={ledgerData}
        onClose={() => {
          setCorrectionModalOpen(false);
          setSelectedCorrectionRef('');
          setSelectedCorrectionAmount('');
        }}
        onSuccess={() => {
          setCorrectionModalOpen(false);
          setSelectedCorrectionRef('');
          setSelectedCorrectionAmount('');
          handleRefreshProfile(false);
        }}
      />

      <ViewCorrectionModal
        isOpen={Boolean(viewCorrectionData)}
        correction={viewCorrectionData}
        onClose={() => setViewCorrectionData(null)}
        onRevalidate={(corr) => {
          handleOpenCorrection({ receipt_no: corr.points_ledger_reference || '' });
        }}
      />

      {/* Advisor View-Only Notice Modal */}
      {advisorViewOnlyNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Advisor View-Only Notice</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Service Advisors have view-only access to customer profiles and ledger. Bill corrections, point redemptions, and receipt transactions must be processed by Cashiers.
            </p>
            <button
              type="button"
              onClick={() => setAdvisorViewOnlyNotice(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer360View;
