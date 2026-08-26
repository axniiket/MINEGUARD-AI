export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'officer' | 'regulator' | string;
  assigned_mine_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Mine {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  state: string;
  mine_type: string;
  status: string;
  compliance_score: number;
  created_at: string;
}

export interface Observation {
  id: string;
  inspection_id: string;
  description: string;
  image_url: string | null;
  severity: string;
  created_at: string;
}

export interface Inspection {
  id: string;
  mine_id: string;
  inspector_id: string;
  type: string;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  ai_category: string | null;
  ai_severity: string | null;
  ai_recommended_actions: string | null;
  ai_risk_score: number | null;
  status: string;
  doc_filename?: string | null;
  doc_file_url?: string | null;
  doc_extracted_text?: string | null;
  doc_extraction_status?: string | null;
  doc_uploaded_at?: string | null;
  created_at: string;
  observations: Observation[];
}

export interface Alert {
  id: string;
  mine_id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  status: string;
  created_at: string;
}

export interface MineDashboard {
  mine: Mine;
  total_inspections: number;
  open_alerts: number;
  recent_inspections: Inspection[];
  compliance_score: number;
}

export interface ComplianceEvent {
  id: string;
  mine_id: string;
  title: string;
  regulation_code?: string | null;
  category: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue' | string;
  priority: 'critical' | 'high' | 'medium' | 'low' | string;
  assigned_to?: string | null;
  reminder_days_before: number;
  completed_at?: string | null;
  created_at: string;
}

export interface CorrectiveAction {
  id: string;
  mine_id: string;
  inspection_id?: string | null;
  alert_id?: string | null;
  title: string;
  description?: string | null;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  deadline: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | string;
  status: 'pending' | 'in_progress' | 'escalated' | 'completed' | string;
  is_escalated: boolean;
  escalation_reason?: string | null;
  closure_evidence?: string | null;
  closed_by_id?: string | null;
  closed_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  action_type: string;
  entity_type: string;
  entity_id?: string | null;
  mine_id?: string | null;
  details?: string | null;
  created_at: string;
}

export interface RiskAnalytics {
  high_risk_mines: Array<{
    mine_id: string;
    mine_name: string;
    location: string;
    state: string;
    compliance_score: number;
    open_alerts: number;
    critical_alerts: number;
    overdue_items: number;
    calculated_risk_index: number;
    risk_tier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  }>;
  recurring_violations: Array<{
    violation_type: string;
    occurrences: number;
    severity: string;
    recommended_policy: string;
  }>;
  overdue_actions_count: number;
  overdue_compliance_count: number;
  compliance_breakdown: Record<string, number>;
  status_summary: {
    total_mines: number;
    total_alerts: number;
    active_alerts: number;
    overdue_actions: number;
  };
}

export interface Token {
  access_token: string;
  token_type: string;
}
