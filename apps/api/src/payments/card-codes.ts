export const TOSS_CARD_CODES: Record<string, string> = {
  '11': 'BC카드',
  '12': '광주은행',
  '14': 'IBK기업은행',
  '15': '우리카드',
  '16': '농협카드',
  '17': '수협카드',
  '20': '국민은행',
  '21': '경남은행',
  '24': '시티카드',
  '25': '대구은행',
  '26': '부산은행',
  '27': '저축은행중앙회',
  '31': '제주은행',
  '32': '전북은행',
  '34': '하나카드',
  '35': '신한카드',
  '36': '현대카드',
  '37': '롯데카드',
  '38': '삼성카드',
  '39': 'KB국민카드',
  '41': 'NH농협카드',
  '42': '저축은행',
  '43': '카카오뱅크',
  '44': '케이뱅크',
  '46': '토스뱅크',
  '48': 'MG새마을금고',
  '71': '우체국예금보험',
};

export function matchCardIssuer(
  tossIssuerCode: string,
  partnerName: string,
): boolean {
  const tossIssuerName = TOSS_CARD_CODES[tossIssuerCode];
  if (!tossIssuerName) return false;

  const normalize = (s: string) =>
    s.replace(/카드|은행|주식회사|\(주\)/g, '').trim();

  const normalizedToss = normalize(tossIssuerName);
  const normalizedPartner = normalize(partnerName);

  return (
    normalizedToss === normalizedPartner ||
    normalizedToss.includes(normalizedPartner) ||
    normalizedPartner.includes(normalizedToss)
  );
}
