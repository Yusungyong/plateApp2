import Config from 'react-native-config';

export type LegalDocumentType = 'terms' | 'privacy';

export const TERMS_OF_SERVICE_URL = (Config as any).TERMS_OF_SERVICE_URL || '';
export const PRIVACY_POLICY_URL = (Config as any).PRIVACY_POLICY_URL || '';

export const LEGAL_DOCUMENT_META: Record<
  LegalDocumentType,
  {
    title: string;
    shortLabel: string;
    urlEnvKey: 'TERMS_OF_SERVICE_URL' | 'PRIVACY_POLICY_URL';
  }
> = {
  terms: {
    title: '이용약관',
    shortLabel: '서비스 이용약관',
    urlEnvKey: 'TERMS_OF_SERVICE_URL',
  },
  privacy: {
    title: '개인정보 처리방침',
    shortLabel: '개인정보 처리방침',
    urlEnvKey: 'PRIVACY_POLICY_URL',
  },
};

export const getLegalUrl = (type: LegalDocumentType) =>
  type === 'terms' ? TERMS_OF_SERVICE_URL : PRIVACY_POLICY_URL;
