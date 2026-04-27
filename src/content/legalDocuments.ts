import type { LegalDocumentType } from '../config/legal';

type LegalFallbackSection = {
  title: string;
  body: string;
};

type LegalFallbackDocument = {
  intro: string;
  sections: LegalFallbackSection[];
};

export const LEGAL_FALLBACK_DOCUMENTS: Record<
  LegalDocumentType,
  LegalFallbackDocument
> = {
  terms: {
    intro:
      '이 화면은 앱 내부에서 이용약관을 확인하기 위한 영역입니다. 아직 최종 약관 본문이 연결되지 않은 경우, 아래 안내만 표시됩니다.',
    sections: [
      {
        title: '현재 상태',
        body:
          '약관 원문 URL이 설정되면 이 화면 안에서 내용을 바로 읽을 수 있습니다. 아직 연결되지 않았다면 관리자가 문서 URL 또는 본문 데이터를 추가해야 합니다.',
      },
      {
        title: '어디에 연결되는지',
        body:
          '회원가입 단계와 마이페이지의 이용약관 메뉴는 모두 이 내부 화면으로 연결됩니다. 문서가 준비되면 앱 전역에서 같은 약관을 보게 됩니다.',
      },
      {
        title: '다음 작업',
        body:
          '실제 법률 문구가 준비되면 TERMS_OF_SERVICE_URL 환경변수를 연결하거나, 이 프로젝트 안에 약관 본문 데이터를 직접 넣어 교체하면 됩니다.',
      },
    ],
  },
  privacy: {
    intro:
      '이 화면은 앱 내부에서 개인정보 처리방침을 보여주기 위한 영역입니다. 아직 최종 문서가 연결되지 않으면 기본 안내만 표시됩니다.',
    sections: [
      {
        title: '현재 상태',
        body:
          '개인정보 처리방침 원문 URL이 설정되면 이 화면 안에서 본문을 불러와 표시합니다. 아직 연결되지 않았다면 문서 설정이 추가로 필요합니다.',
      },
      {
        title: '어디에 연결되는지',
        body:
          '회원가입 단계와 마이페이지의 개인정보 처리방침 메뉴는 모두 이 내부 화면을 사용합니다. 한 번 연결해두면 두 흐름이 같이 맞춰집니다.',
      },
      {
        title: '다음 작업',
        body:
          '실제 정책 문구가 준비되면 PRIVACY_POLICY_URL 환경변수를 연결하거나, 프로젝트 내부 본문 데이터로 대체할 수 있습니다.',
      },
    ],
  },
};
