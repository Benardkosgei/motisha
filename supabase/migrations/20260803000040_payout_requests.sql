-- Migration: payout_requests
-- Teachers can request withdrawal of their referral commissions.

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes    DECIMAL(10, 2) NOT NULL CHECK (amount_kes > 0),
  payment_method TEXT   NOT NULL CHECK (payment_method IN ('mpesa', 'bank')),
  mpesa_phone   TEXT,
  bank_account  TEXT,
  bank_name     TEXT,
  status        TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  admin_notes   TEXT,
  processed_by  TEXT,   -- admin username who approved/rejected
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payout_requests_user    ON public.payout_requests (user_id, created_at DESC);
CREATE INDEX idx_payout_requests_status  ON public.payout_requests (status, created_at DESC);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "payout_requests_user_select"
  ON public.payout_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "payout_requests_user_insert"
  ON public.payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update (admin approvals happen server-side)
-- No client UPDATE policy — all status changes go through the admin API with service role.

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_payout_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_payout_updated_at();
