import { type Invoice } from './invoice-rules';
import { quoteTotals, lineTotal } from './quote-rules';
import { formatDate, formatEUR } from './format';
export async function downloadInvoice(invoice: Invoice) {
 const { jsPDF } = await import('jspdf');
 const doc = new jsPDF(); let y=22;
 const text=(value:string,size=10) => { doc.setFontSize(size); const lines=doc.splitTextToSize(value,170); const height=lines.length*(size*0.45+1); if(y+height>275){doc.addPage();y=22;} doc.text(lines,20,y);y+=height+3; };
 text(`FACTURA ${invoice.number ?? 'BORRADOR'}`,18); text(invoice.title,13);
 text(`Fecha: ${formatDate(invoice.issue_date)}   Vencimiento: ${formatDate(invoice.due_date)}`);
 for(const [label,party] of [['Emisor',invoice.issuer],['Cliente',invoice.recipient]] as const){ text(label,12); if(party) text([party.name,party.tax_id,party.address,party.email,party.phone].filter(Boolean).join('\n')); }
 y+=4;
 for(const it of invoice.items) text(`${it.description}\n${it.quantity} ${it.unit} x ${formatEUR(it.unit_price)} = ${formatEUR(lineTotal(it))}`);
 const t=quoteTotals(invoice.items,invoice.vat_rate); y+=5;
 text(`Base imponible: ${formatEUR(t.base)}`);text(`IVA (${invoice.vat_rate}%): ${formatEUR(t.vat)}`);text(`TOTAL: ${formatEUR(t.total)}`,14);
 if(invoice.status==='cancelled') text('ANULADA',14);
 if(invoice.notes) text(invoice.notes);
 doc.save(`${invoice.number ?? 'borrador'}.pdf`);
}
