-- Trading accounts (multiple per user)
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  broker TEXT,
  balance NUMERIC NOT NULL DEFAULT 10000,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own accounts" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own accounts" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own accounts" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own accounts" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_trading_accounts_updated BEFORE UPDATE ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Risk presets
CREATE TABLE public.risk_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  risk_pct NUMERIC NOT NULL DEFAULT 1,
  rr_ratio NUMERIC,
  max_daily_risk_pct NUMERIC,
  max_weekly_risk_pct NUMERIC,
  strategy_tag TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own presets" ON public.risk_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own presets" ON public.risk_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own presets" ON public.risk_presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own presets" ON public.risk_presets FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_risk_presets_updated BEFORE UPDATE ON public.risk_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Coach conversations
CREATE TABLE public.coach_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own conversations" ON public.coach_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations" ON public.coach_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.coach_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON public.coach_conversations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_coach_conv_updated BEFORE UPDATE ON public.coach_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_coach_conv_user ON public.coach_conversations(user_id, updated_at DESC);

-- Coach messages
CREATE TABLE public.coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own messages" ON public.coach_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.coach_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.coach_messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_coach_msg_conv ON public.coach_messages(conversation_id, created_at);

-- Add risk_preset_id and account_id to trades for linkage
ALTER TABLE public.trades ADD COLUMN account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.trades ADD COLUMN risk_preset_id UUID REFERENCES public.risk_presets(id) ON DELETE SET NULL;