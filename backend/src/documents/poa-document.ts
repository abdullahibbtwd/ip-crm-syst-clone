import type { DocumentMergeContext } from './document-merge.util';

export const POA_TEMPLATE_ID = '00000000-0000-4000-a000-000000000005';
export const POA_TEMPLATE_SLUG = 'power-of-attorney';

export const POA_TEMPLATE_SEED = {
  id: POA_TEMPLATE_ID,
  slug: POA_TEMPLATE_SLUG,
  name: 'Power of Attorney',
  category: 'application' as const,
  description:
    'Bilingual Bulgarian Patent Office power of attorney (пълномощно).',
  referenceLine: 'POA — {{poaObject}}',
  htmlBody: `<p>{{legalEntityName}}</p>
<p>{{mol}}</p>
<p>{{clientAddress}}</p>
<p>{{representativeName}}</p>
<p>{{representativeAddress}}</p>
<p>{{poaObject}}</p>`,
};

export function isPoaTemplate(slug: string | null | undefined): boolean {
  return slug === POA_TEMPLATE_SLUG;
}

export function renderPoaDocument(fields: DocumentMergeContext): string {
  const legalEntity =
    fields.legalEntityName?.trim() || fields.clientName?.trim() || '';
  const representativeName =
    fields.representativeName?.trim() || fields.attorneyName?.trim() || '';
  const representativeAddress =
    fields.representativeAddress?.trim() ||
    [fields.firmAddressLine1, fields.firmAddressLine2]
      .filter((line) => line?.trim())
      .join(', ');
  const objectLine =
    fields.poaObject?.trim() ||
    `${fields.matterType || 'Обект'} no. ${fields.applicationNumber || '—'} - ${fields.ipRightTitle || fields.matterTitle || ''}`.trim();

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <title>Пълномощно / Power of Attorney</title>
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111;
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
    }
    .poa { width: 100%; }
    .title {
      display: flex;
      justify-content: space-between;
      font-size: 16pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0 0 16px;
    }
    .bi-row {
      display: flex;
      gap: 18px;
      margin: 0 0 6px;
    }
    .col { width: 50%; }
    .col.en { text-align: right; }
    .filled {
      text-align: center;
      font-weight: 700;
      font-size: 12pt;
      margin: 4px 0 10px;
      white-space: pre-line;
    }
    .legal {
      margin-top: 10px;
      text-align: justify;
    }
    .sig {
      display: flex;
      gap: 18px;
      margin-top: 22px;
    }
    .sig .col { font-size: 10.5pt; }
    .sig-lines { margin-top: 8px; }
    .note {
      margin-top: 18px;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .note-en { font-style: italic; margin-top: 6px; }
    .no-legal {
      margin-top: 16px;
      font-size: 9pt;
    }
    .no-legal strong { display: block; margin-top: 4px; letter-spacing: 0.02em; }
  </style>
</head>
<body>
  <div class="poa">
    <div class="title"><span>ПЪЛНОМОЩНО</span><span>POWER OF ATTORNEY</span></div>

    <div class="bi-row">
      <div class="col">Долуподписаният/ите,</div>
      <div class="col en">The undersigned</div>
    </div>
    <div class="filled">${escapeHtml(legalEntity)}</div>
    ${fields.mol?.trim() ? `<div class="filled">МОЛ / MOL: ${escapeHtml(fields.mol.trim())}</div>` : ''}
    ${fields.clientAddress?.trim() ? `<div class="filled">${escapeMultiline(fields.clientAddress)}</div>` : ''}

    <div class="bi-row">
      <div class="col">УПЪЛНОМОЩАВАМЕ</div>
      <div class="col en">AUTHORIZE</div>
    </div>
    <div class="filled">${escapeHtml(representativeName)}</div>
    <div class="filled">${escapeMultiline(representativeAddress)}</div>

    <div class="bi-row">
      <div class="col">да ме представлява относно:</div>
      <div class="col en">to represent us in connection with</div>
    </div>
    <div class="filled">${escapeHtml(objectLine)}</div>

    <div class="bi-row legal">
      <div class="col">като извършва от мое име и за моя сметка всички необходими действия пред Патентното ведомство и съдебните власти на Р. България, международното бюро, защитавайки моите права и законни интереси, относно посочения/те тук обект/и на индустриална собственост, както и да прехвърля изцяло или частично предоставените му тук правомощия на трето лице, което има законовото право да ги упражнява.</div>
      <div class="col">- taking on my behalf and at my expense all necessary steps before the Patent Office and the legal authorities of the Republic of Bulgaria, International Bureau, protecting my rights and lawful interests, concerning the industrial property object/s mentioned herein, as well as to assign completely or partially the legal rights given to him hereby to a third person, the latter having the legal rights to exercise them.</div>
    </div>

    <div class="bi-row legal">
      <div class="col">Настоящето пълномощно отменя всички предходни упълномощявания и пълномощни, дадени на трети лица.</div>
      <div class="col">The present POA revokes all and any POAs given before its date of signing.</div>
    </div>

    <div class="bi-row" style="margin-top:18px">
      <div class="col">Дата:............</div>
      <div class="col en">Date:............</div>
    </div>

    <div class="sig">
      <div class="col">
        Упълномощител:*
        <div class="sig-lines">..............................<br/>.........................</div>
      </div>
      <div class="col en">
        Authorizer:*
        <div class="sig-lines">..............................<br/>.........................</div>
      </div>
    </div>

    <div class="note">
      При подписа на упълномощителя да се посочва името му.
      Когато упълномощяването е от фирма, да се посочва и длъжността на подписалия, като се полага печата на фирмата.
      <div class="note-en">/The name of the authorizer shall be given under his signature. Where the authorizer is a firm, the position of the person who has signed shall be given, and the seal of the Firm shall be put thereto/.</div>
    </div>

    <div class="no-legal">
      <div class="bi-row">
        <div class="col">(Важи за упълномощяване само на представители по ИС, вписани в регистъра на Патентното ведомство)</div>
        <div class="col">Applies to authorization only of industrial property representatives entered in the Register of the patent Office.</div>
      </div>
      <strong>БЕЗ НОТАРИАЛНА ЗАВЕРКА</strong>
      <strong>NO LEGALIZATION REQUIRED</strong>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMultiline(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}
