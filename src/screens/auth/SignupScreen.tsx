import React, { useCallback, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { colors, spacing } from '../../styles/theme';

import SignupHeader from './components/SignupHeader';
import SignupStepTerms from './components/SignupStepTerms';
import SignupStepEmail from './components/SignupStepEmail';
import SignupStepPassword from './components/SignupStepPassword';
import SignupStepNickname from './components/SignupStepNickname';
import SignupFooter from './components/SignupFooter';

interface SignupFormValues {
  id: string;
  password: string;
  nickname: string;
}

interface SignupScreenProps {
  onSubmit?: (values: SignupFormValues) => void | Promise<void>;
  onBackToLoginPress?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

// 0: 약관, 1: 이메일, 2: 비밀번호, 3: 닉네임
type Step = 0 | 1 | 2 | 3;

const SignupScreen: React.FC<SignupScreenProps> = ({
  onSubmit,
  onBackToLoginPress,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  // 1) 상태값들
  const [step, setStep] = useState<Step>(0);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 각 스텝의 유효 여부 (✅ 스텝 컴포넌트에서 계산해서 여기로 알려줌)
  const [isTermsValid, setIsTermsValid] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isNicknameValid, setIsNicknameValid] = useState(false);

  // 2) ref들 (포커스 체인)
  const emailInputRef = useRef<TextInput | null>(null);
  const pwInputRef = useRef<TextInput | null>(null);
  const pwConfirmInputRef = useRef<TextInput | null>(null);
  const nicknameInputRef = useRef<TextInput | null>(null);

  // 3) 애니메이션 (단계 전환 페이드)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const runStepTransition = useCallback(
    (nextStep: Step) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setStep(nextStep);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  // 4) 스텝별 진행 가능 여부 (각 스텝의 valid 결과만 사용)
  const canGoNextByStep: Record<Step, boolean> = {
    0: isTermsValid,
    1: isEmailValid,
    2: isPasswordValid,
    3: isNicknameValid && !submitting,
  };

  const isLastStep = step === 3;
  const canSubmit = isLastStep && canGoNextByStep[3];

  // 5) 이벤트 핸들러
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !onSubmit) return;

    try {
      setSubmitting(true);
      await onSubmit({
        id: id.trim(),
        password,
        nickname: nickname.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, onSubmit, id, password, nickname]);

  const handleNext = () => {
    if (!canGoNextByStep[step]) return;

    if (step === 3) {
      handleSubmit();
      return;
    }

    const nextStep = (step + 1) as Step;
    runStepTransition(nextStep);

    if (nextStep === 1) {
      setTimeout(() => emailInputRef.current?.focus(), 250);
    } else if (nextStep === 2) {
      setTimeout(() => pwInputRef.current?.focus(), 250);
    } else if (nextStep === 3) {
      setTimeout(() => nicknameInputRef.current?.focus(), 250);
    }
  };

  const handlePrev = () => {
    if (step === 0) return;
    const prevStep = (step - 1) as Step;
    runStepTransition(prevStep);
  };

  const handleToggleService = () => setAgreeService(prev => !prev);
  const handleTogglePrivacy = () => setAgreePrivacy(prev => !prev);

  const handleToggleAll = () => {
    const next = !(agreeService && agreePrivacy);
    setAgreeService(next);
    setAgreePrivacy(next);
  };

  // 6) 단계별 서브 타이틀
  const stepSubtitleByStep: Record<Step, string> = {
    0: '서비스 이용을 위한 필수 약관에 동의해주세요',
    1: '로그인에 사용할 이메일 주소를 입력해요',
    2: '안전한 식당 기록을 위해 비밀번호를 설정해요',
    3: '앱에서 표시될 이름이에요',
  };

  // 7) 단계 내용 렌더링
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <SignupStepTerms
            agreeService={agreeService}
            agreePrivacy={agreePrivacy}
            onToggleAll={handleToggleAll}
            onToggleService={handleToggleService}
            onTogglePrivacy={handleTogglePrivacy}
            onOpenTerms={onOpenTerms}
            onOpenPrivacy={onOpenPrivacy}
            onValidityChange={setIsTermsValid}
          />
        );

      case 1:
        return (
          <SignupStepEmail
            value={id}
            onChangeText={setId}
            inputRef={emailInputRef}
            onSubmitEditing={handleNext}
            onValidityChange={setIsEmailValid}
          />
        );

      case 2:
        return (
          <SignupStepPassword
            password={password}
            passwordConfirm={passwordConfirm}
            onChangePassword={setPassword}
            onChangePasswordConfirm={setPasswordConfirm}
            pwInputRef={pwInputRef}
            pwConfirmInputRef={pwConfirmInputRef}
            onValidityChange={setIsPasswordValid}
          />
        );

      case 3:
        return (
          <SignupStepNickname
            nickname={nickname}
            onChangeNickname={setNickname}
            inputRef={nicknameInputRef}
            onSubmitEditing={handleNext}
            onValidityChange={setIsNicknameValid}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 상단 타이틀 + 스텝 표시 */}
          <SignupHeader
            step={step}
            subtitle={stepSubtitleByStep[step]}
          />

          {/* 카드 영역 - 페이드 전환 */}
          <View style={styles.card}>
            <Animated.View style={{ opacity: fadeAnim }}>
              {renderStep()}
            </Animated.View>
          </View>

          {/* CTA + 로그인 링크 */}
          <SignupFooter
            step={step}
            canGoNext={canGoNextByStep[step]}
            isSubmitting={submitting}
            isLastStep={isLastStep}
            onPrev={handlePrev}
            onNext={handleNext}
            onBackToLogin={onBackToLoginPress}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
});

export default SignupScreen;
