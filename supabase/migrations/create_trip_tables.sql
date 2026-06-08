-- 旅行规划表
CREATE TABLE IF NOT EXISTS trip_plans (
  id VARCHAR(100) PRIMARY KEY NOT NULL,
  wish_id VARCHAR(100) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  travel_days INTEGER NOT NULL,
  travelers VARCHAR(500) NOT NULL,
  days JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS trip_plans_wish_id_idx ON trip_plans(wish_id);

-- 旅行记账表
CREATE TABLE IF NOT EXISTS trip_expenses (
  id VARCHAR(100) PRIMARY KEY NOT NULL,
  wish_id VARCHAR(100) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  expenses JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS trip_expenses_wish_id_idx ON trip_expenses(wish_id);

-- 默认旅行设置表
CREATE TABLE IF NOT EXISTS default_trip (
  id SERIAL PRIMARY KEY,
  wish_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 更新触发器：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 trip_plans 表添加更新触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trip_plans_updated_at') THEN
        CREATE TRIGGER trip_plans_updated_at
            BEFORE UPDATE ON trip_plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 为 trip_expenses 表添加更新触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trip_expenses_updated_at') THEN
        CREATE TRIGGER trip_expenses_updated_at
            BEFORE UPDATE ON trip_expenses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 为 default_trip 表添加更新触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'default_trip_updated_at') THEN
        CREATE TRIGGER default_trip_updated_at
            BEFORE UPDATE ON default_trip
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 旅行驾驶记录表
CREATE TABLE IF NOT EXISTS trip_driving_records (
  id VARCHAR(100) PRIMARY KEY NOT NULL,
  wish_id VARCHAR(100) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date VARCHAR(20),
  records JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS trip_driving_records_wish_id_idx ON trip_driving_records(wish_id);

-- 为 trip_driving_records 表添加更新触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trip_driving_records_updated_at') THEN
        CREATE TRIGGER trip_driving_records_updated_at
            BEFORE UPDATE ON trip_driving_records
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
