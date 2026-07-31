-- Additional working-file / work-type categories (MatterType + IntakeMatterType).
ALTER TYPE "matter_type" ADD VALUE IF NOT EXISTS 'cases';
ALTER TYPE "matter_type" ADD VALUE IF NOT EXISTS 'domain';
ALTER TYPE "matter_type" ADD VALUE IF NOT EXISTS 'litigation_expert_report';
ALTER TYPE "matter_type" ADD VALUE IF NOT EXISTS 'consultation';
ALTER TYPE "matter_type" ADD VALUE IF NOT EXISTS 'official_fee_payment';
ALTER TYPE "matter_type" ADD VALUE IF NOT EXISTS 'other';

ALTER TYPE "intake_matter_type" ADD VALUE IF NOT EXISTS 'cases';
ALTER TYPE "intake_matter_type" ADD VALUE IF NOT EXISTS 'domain';
ALTER TYPE "intake_matter_type" ADD VALUE IF NOT EXISTS 'litigation_expert_report';
ALTER TYPE "intake_matter_type" ADD VALUE IF NOT EXISTS 'consultation';
ALTER TYPE "intake_matter_type" ADD VALUE IF NOT EXISTS 'official_fee_payment';
-- intake_matter_type.other already exists
