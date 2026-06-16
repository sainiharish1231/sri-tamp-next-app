import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type PdfKind = "order" | "material" | "financial";

type GeneratePdfOptions = {
  kind: PdfKind;
  record: any;
  party?: any;
  user?: any;
};

const money = (value: unknown) => {
  const parsed = Number(value ?? 0);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return `&#8377;${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const text = (value: unknown, fallback = "-") => {
  const output = String(value ?? "").trim();
  return output || fallback;
};

const escapeHtml = (value: unknown) =>
  text(value, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (value: any) => {
  if (!value) return "-";
  let date: Date | null = null;

  if (value instanceof Date) date = value;
  else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else {
    const seconds = value?._seconds ?? value?.seconds;
    if (typeof seconds === "number") date = new Date(seconds * 1000);
  }

  if (!date || Number.isNaN(date.getTime())) return text(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUserName = (user?: any) =>
  text(
    user?.name ||
      user?.businessName ||
      user?.partyName ||
      user?.company?.name ||
      user?.party?.name,
    "San Raj Metal Arts",
  );

const getPartyName = (record?: any, party?: any) =>
  text(
    party?.name ||
      party?.partyName ||
      record?.partyName ||
      record?.party?.name,
    "Party",
  );

const infoLine = (label: string, value: unknown, rawValue = false) => {
  const output = text(value, "");
  if (!output) return "";
  return `<div class="line"><span>${escapeHtml(label)}</span><strong>${
    rawValue ? output : escapeHtml(output)
  }</strong></div>`;
};

const detailValue = (record: any, keys: string[]) => {
  for (const key of keys) {
    const output = text(record?.[key], "");
    if (output) return output;
  }

  return "";
};

const accountValue = (record: any) =>
  detailValue(record, [
    "accountNumber",
    "bankAccountNumber",
    "accountNo",
    "accNo",
    "accNumber",
  ]);

const bankDetails = (record?: any) => record?.bankDetails || record || {};

const panValue = (record: any) =>
  detailValue(record, ["panNumber", "panNo", "pan", "panCardNumber"]);

const gstValue = (record: any) =>
  detailValue(record, ["gstNumber", "gstNo", "gst", "gstin"]);

const partyBlock = (record: any, party?: any, title = "To Party Details") => {
  const bank = bankDetails(party);
  const taxLines = [
    infoLine("GST", gstValue(party) || record?.partyGstNumber),
    infoLine("PAN", panValue(party) || record?.partyPanNumber),
  ]
    .filter(Boolean)
    .join("");
  const accountLines = [
    infoLine("Account Holder", bank.accountHolderName || party?.accountHolderName),
    infoLine(
      "Account No",
      accountValue(bank) || accountValue(party) || record?.partyAccountNumber,
    ),
    infoLine("Bank", bank.bankName || party?.bankName || record?.partyBankName),
    infoLine("Branch", bank.branchName || party?.branchName || record?.partyBranchName),
    infoLine(
      "IFSC",
      bank.ifscCode || party?.ifscCode || party?.ifsc || record?.partyIfsc,
    ),
    infoLine("Account Type", bank.accountType || party?.accountType),
  ]
    .filter(Boolean)
    .join("");

  return `
  <section class="box">
    <div class="box-title">${escapeHtml(title)}</div>
    <h3>${escapeHtml(getPartyName(record, party))}</h3>
    ${infoLine("Phone", party?.mobile || party?.phone || record?.partyPhone)}
    ${infoLine("Email", party?.email || record?.partyEmail)}
    ${infoLine("Address", party?.address || record?.partyAddress)}
    ${infoLine(
      "Contact Person",
      party?.contactPerson || party?.userName || record?.contactPerson,
    )}
    ${infoLine("Country Code", party?.countryCode || record?.partyCountryCode)}
    ${infoLine(
      "Dial Code",
      party?.diallingCode || party?.dialingCode || record?.partyDiallingCode,
    )}
    ${infoLine("Type", party?.partyType || party?.partyTypeName)}
    ${taxLines ? `<div class="sub-title">Tax Details</div>${taxLines}` : ""}
    ${
      accountLines
        ? `<div class="sub-title">Account Details</div>${accountLines}`
        : ""
    }
  </section>
`;
};

const userBlock = (user?: any) => {
  const userParty = user?.party || user?.company || user?.business || {};
  const bank = bankDetails(userParty);
  const taxLines = [
    infoLine("GST", gstValue(user) || gstValue(userParty)),
    infoLine("PAN", panValue(user) || panValue(userParty)),
  ]
    .filter(Boolean)
    .join("");
  const accountLines = [
    infoLine("Account Holder", bank.accountHolderName || userParty?.accountHolderName),
    infoLine("Account No", accountValue(user) || accountValue(bank) || accountValue(userParty)),
    infoLine("Bank", bank.bankName || user?.bankName || userParty?.bankName),
    infoLine("Branch", bank.branchName || userParty?.branchName),
    infoLine("IFSC", bank.ifscCode || user?.ifscCode || user?.ifsc || userParty?.ifscCode),
    infoLine("Account Type", bank.accountType || userParty?.accountType),
  ]
    .filter(Boolean)
    .join("");

  return `
    <section class="box">
      <div class="box-title">From Party Details</div>
      <h3>${escapeHtml(getUserName(user))}</h3>
      ${infoLine("Phone", user?.phone || user?.mobile || userParty?.mobile)}
      ${infoLine("Email", user?.email || userParty?.email)}
      ${infoLine("Address", user?.address || userParty?.address)}
      ${infoLine("Country Code", user?.countryCode || userParty?.countryCode)}
      ${infoLine(
        "Dial Code",
        user?.diallingCode ||
          user?.dialingCode ||
          userParty?.diallingCode ||
          userParty?.dialingCode,
      )}
      ${taxLines ? `<div class="sub-title">Tax Details</div>${taxLines}` : ""}
      ${
        accountLines
          ? `<div class="sub-title">Account Details</div>${accountLines}`
          : ""
      }
    </section>
  `;
};

const financialParty = (
  record: any,
  side: "sender" | "receiver",
) => {
  const party = side === "sender" ? record?.senderParty : record?.receiverParty;
  const name =
    side === "sender"
      ? record?.senderPartyName || record?.senderName
      : record?.receiverPartyName || record?.receiverName;
  const id =
    side === "sender" ? record?.senderPartyId : record?.receiverPartyId;

  return {
    id,
    name,
    partyName: name,
    ...(party || {}),
  };
};

const getItemName = (item: any) =>
  text(
    item?.itemName ||
      item?.name ||
      item?.productName ||
      item?.materialName ||
      item?.metalName,
    "Item",
  );

const getItemWeight = (item: any) => {
  const direct = number(item?.weightKg ?? item?.totalWeight ?? item?.weight, 0);
  if (direct) return direct;
  return number(item?.kg, 0) + number(item?.gram, 0) / 1000;
};

const itemRow = (item: any, index: number, label = "") => {
  const qty = text(
    item?.quantity ?? item?.orderedQty ?? item?.qty ?? item?.count ?? "-",
  );
  const rateUnit = item?.rateUnit || item?.priceUnit || "kg";
  return `<tr>
    <td>${index + 1}</td>
    <td><strong>${escapeHtml(getItemName(item))}</strong><small>${escapeHtml(label || item?.itemType || item?.type || "item")}</small></td>
    <td>${escapeHtml(qty)}</td>
    <td>${getItemWeight(item).toFixed(3)} kg</td>
    <td>${money(item?.ratePerKg ?? item?.rate ?? item?.price)} / ${escapeHtml(rateUnit)}</td>
    <td class="right">${money(item?.grandTotal ?? item?.totalAmount ?? item?.amount)}</td>
  </tr>`;
};

const buildOrderRows = (record: any) =>
  (Array.isArray(record?.items) ? record.items : [])
    .map((item: any, index: number) => itemRow(item, index, item?.itemType))
    .join("");

const buildMaterialRows = (record: any) => {
  const items = Array.isArray(record?.items) ? record.items : [];
  const extraItems = Array.isArray(record?.extraItems) ? record.extraItems : [];
  return [
    ...items.map((item: any, index: number) => itemRow(item, index)),
    ...extraItems.map((item: any, index: number) =>
      itemRow(item, items.length + index, "extra item"),
    ),
  ].join("");
};

const buildFinancialRows = (record: any) => `
  <tr>
    <td>1</td>
    <td><strong>${escapeHtml(record?.senderPartyName || record?.senderName || "Sender")}</strong><small>From Party</small></td>
    <td colspan="2">${escapeHtml(record?.paymentMode || "cash")}</td>
    <td>${escapeHtml(record?.receiverPartyName || record?.receiverName || "Receiver")}</td>
    <td class="right">${money(record?.amount)}</td>
  </tr>
`;

const getRows = (kind: PdfKind, record: any) => {
  const rows =
    kind === "order"
      ? buildOrderRows(record)
      : kind === "material"
        ? buildMaterialRows(record)
        : buildFinancialRows(record);

  return (
    rows ||
    `<tr><td colspan="6" class="empty">No detail available</td></tr>`
  );
};

const getTableHeader = (kind: PdfKind) => {
  if (kind === "financial") {
    return `<tr><th>#</th><th>From Party</th><th colspan="2">Mode</th><th>To Party</th><th class="right">Amount</th></tr>`;
  }

  return `<tr><th>#</th><th>Item / Account</th><th>Qty</th><th>Weight</th><th>Rate / Mode</th><th class="right">Amount</th></tr>`;
};

const getTitle = (kind: PdfKind, record: any) => {
  if (kind === "order") {
    return `${text(record?.orderType, "Order")} Order`;
  }
  if (kind === "material") return "Material Transaction";
  return "Financial Transaction";
};

const getReference = (kind: PdfKind, record: any) => {
  if (kind === "order") return text(record?.orderNumber || record?.orderId || record?.id);
  if (kind === "material") return text(record?.transactionNo || record?.id);
  return text(record?.transactionNo || record?.id);
};

const getDate = (kind: PdfKind, record: any) => {
  if (kind === "order") return formatDate(record?.orderDate || record?.createdAt);
  return formatDate(record?.transactionDate || record?.createdAt);
};

const getTotals = (kind: PdfKind, record: any) => {
  if (kind === "financial") {
    return [{ label: "Amount", value: money(record?.amount), strong: true }];
  }

  const summary = record?.summary || {};
  const totalWeight = number(summary.totalWeight ?? record?.totalWeight, 0);
  const totalAmount = number(
    summary.grandTotal ??
      record?.grandTotal ??
      summary.totalAmount ??
      record?.totalAmount,
    0,
  );
  const totalItems =
    number(summary.totalItems, 0) ||
    (Array.isArray(record?.items) ? record.items.length : 0) +
      (Array.isArray(record?.extraItems) ? record.extraItems.length : 0);

  const totals: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: "Total Items", value: String(totalItems) },
    { label: "Total Weight", value: `${totalWeight.toFixed(3)} kg` },
    {
      label: "Subtotal",
      value: money(record?.totalAmount ?? summary.totalAmount),
    },
  ];

  if (record?.gst?.includeGst) {
    totals.push({ label: "GST", value: money(record?.gst?.gstAmount) });
  }

  totals.push({ label: "Grand Total", value: money(totalAmount), strong: true });
  return totals;
};

const buildHtml = ({ kind, record, party, user }: GeneratePdfOptions) => {
  const title = getTitle(kind, record);
  const reference = getReference(kind, record);
  const type = text(
    record?.transactionType ||
      record?.orderType ||
      record?.financialType ||
      record?.status,
    kind,
  );
  const totals = getTotals(kind, record);
  const brandTitle =
    kind === "financial"
      ? `${text(record?.senderPartyName || record?.senderName, "From Party")} to ${text(
          record?.receiverPartyName || record?.receiverName,
          "To Party",
        )}`
      : getUserName(user);
  const partyGrid =
    kind === "financial"
      ? `${partyBlock(record, financialParty(record, "sender"), "From Party Details")}${partyBlock(
          record,
          financialParty(record, "receiver"),
          "To Party Details",
        )}`
      : `${userBlock(user)}${partyBlock(record, party, "To Party Details")}`;

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;margin:0;padding:28px;color:#0f172a;background:#fff;font-size:12px}
      .top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:18px}
      .brand{font-size:24px;font-weight:900;color:#2563eb;letter-spacing:.2px}.sub{font-size:11px;color:#64748b;margin-top:3px}.badge{background:#2563eb;color:#fff;border-radius:8px;padding:8px 14px;font-weight:800;text-transform:uppercase}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.box{border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:14px}.box-title{font-size:10px;text-transform:uppercase;color:#2563eb;font-weight:900;letter-spacing:.6px;margin-bottom:8px}.sub-title{font-size:9px;text-transform:uppercase;color:#334155;font-weight:900;letter-spacing:.5px;margin-top:10px;padding-top:8px;border-top:1px solid #cbd5e1}h3{margin:0 0 8px;font-size:15px}
      .line{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:6px}.line span{color:#64748b}.line strong{text-align:right}
      .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.meta div{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff}.meta span{display:block;color:#64748b;text-transform:uppercase;font-size:9px;font-weight:800}.meta strong{display:block;margin-top:5px;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#eff6ff;color:#1d4ed8;text-align:left;font-size:10px;text-transform:uppercase;padding:10px;border-bottom:2px solid #bfdbfe}td{padding:10px;border-bottom:1px solid #e2e8f0;vertical-align:top}td small{display:block;margin-top:3px;color:#64748b;text-transform:capitalize}.right{text-align:right}.empty{text-align:center;color:#64748b;padding:24px}
      .totals{margin-left:auto;margin-top:16px;width:310px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}.total-row{display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e2e8f0}.total-row:last-child{border-bottom:0}.strong{background:#eff6ff;color:#1d4ed8;font-weight:900}
      .note{margin-top:14px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:12px}.footer{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:10px;text-align:center;color:#94a3b8;font-size:10px}
    </style>
  </head>
  <body>
    <div class="top"><div><div class="brand">${escapeHtml(brandTitle)}</div><div class="sub">Generated professional copy</div></div><div class="badge">${escapeHtml(title)}</div></div>
    <div class="grid">${partyGrid}</div>
    <div class="meta">
      <div><span>Reference</span><strong>${escapeHtml(reference)}</strong></div>
      <div><span>Date</span><strong>${escapeHtml(getDate(kind, record))}</strong></div>
      <div><span>Type</span><strong>${escapeHtml(type)}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(record?.status || "completed")}</strong></div>
    </div>
    <table><thead>${getTableHeader(kind)}</thead><tbody>${getRows(kind, record)}</tbody></table>
    <div class="totals">${totals
      .map(
        (item) =>
          `<div class="total-row ${item.strong ? "strong" : ""}"><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong></div>`,
      )
      .join("")}</div>
    ${record?.note ? `<div class="note"><strong>Note:</strong> ${escapeHtml(record.note)}</div>` : ""}
    <div class="footer">Generated on ${escapeHtml(formatDate(new Date()))}</div>
  </body>
  </html>`;
};

const buildFileName = (kind: PdfKind, record: any, party?: any) => {
  const rawName = `${kind}-${getReference(kind, record)}-${getPartyName(record, party)}`;
  return rawName
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
};

export const downloadTransactionPdf = async (options: GeneratePdfOptions) => {
  const html = buildHtml(options);
  const fileName = buildFileName(options.kind, options.record, options.party);
  const printPdf = () => Print.printAsync({ html });

  if (Platform.OS === "web") {
    await printPdf();
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      await printPdf();
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `${fileName}.pdf`,
      UTI: "com.adobe.pdf",
    });
    return;
  } catch {
    await printPdf();
  }
};
