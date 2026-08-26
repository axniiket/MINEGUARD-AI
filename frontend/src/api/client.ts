import axios from 'axios';
import {
  Token,
  User,
  Mine,
  MineDashboard,
  Inspection,
  Alert,
  ComplianceEvent,
  CorrectiveAction,
  AuditLog,
  RiskAnalytics,
} from '../types';

const apiClient = axios.create({
  baseURL: '/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mineguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mineguard_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (email: string, password: string): Promise<Token> => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const response = await apiClient.post<Token>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

export const getMines = async (status?: string): Promise<Mine[]> => {
  const params = status ? { status } : undefined;
  const response = await apiClient.get<Mine[]>('/mines/', { params });
  return response.data;
};

export const getMineLinkedCounts = async (mineId: string): Promise<{
  mine_id: string;
  mine_name: string;
  status: string;
  inspections_count: number;
  alerts_count: number;
  compliance_events_count: number;
  corrective_actions_count: number;
  documents_count: number;
  total_linked: number;
  can_delete: boolean;
}> => {
  const response = await apiClient.get(`/mines/${mineId}/linked-counts`);
  return response.data;
};

export const archiveMine = async (mineId: string): Promise<Mine> => {
  const response = await apiClient.put<Mine>(`/mines/${mineId}/archive`);
  return response.data;
};

export const unarchiveMine = async (mineId: string): Promise<Mine> => {
  const response = await apiClient.put<Mine>(`/mines/${mineId}/unarchive`);
  return response.data;
};

export const deleteMine = async (mineId: string): Promise<{ message: string; deleted: boolean }> => {
  const response = await apiClient.delete(`/mines/${mineId}`);
  return response.data;
};

export const getMineDashboard = async (mineId: string): Promise<MineDashboard> => {
  const response = await apiClient.get<MineDashboard>(`/mines/${mineId}/dashboard`);
  return response.data;
};

// Inspections
export const getInspections = async (mineId?: string): Promise<Inspection[]> => {
  const params = mineId ? { mine_id: mineId } : undefined;
  const response = await apiClient.get<Inspection[]>('/inspections/', { params });
  return response.data;
};

export const getInspection = async (id: string): Promise<Inspection> => {
  const response = await apiClient.get<Inspection>(`/inspections/${id}`);
  return response.data;
};

export const createInspection = async (data: {
  mine_id: string;
  type: string;
  title: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<Inspection> => {
  const response = await apiClient.post<Inspection>('/inspections/', data);
  return response.data;
};

export const uploadInspectionDocument = async (inspectionId: string, file: File): Promise<Inspection> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<Inspection>(`/inspections/${inspectionId}/upload-doc`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Alerts
export const getAlerts = async (status?: string): Promise<Alert[]> => {
  const params = status ? { status } : undefined;
  const response = await apiClient.get<Alert[]>('/alerts/', { params });
  return response.data;
};

export const resolveAlert = async (id: string): Promise<Alert> => {
  const response = await apiClient.put<Alert>(`/alerts/${id}/resolve`);
  return response.data;
};

// Compliance Calendar
export const getComplianceEvents = async (
  mineId?: string,
  status?: string,
  category?: string
): Promise<ComplianceEvent[]> => {
  const params: Record<string, string> = {};
  if (mineId) params.mine_id = mineId;
  if (status) params.status = status;
  if (category) params.category = category;
  const response = await apiClient.get<ComplianceEvent[]>('/compliance/', { params });
  return response.data;
};

export const createComplianceEvent = async (data: {
  mine_id: string;
  title: string;
  regulation_code?: string;
  category: string;
  due_date: string;
  priority?: string;
  assigned_to?: string;
  reminder_days_before?: number;
}): Promise<ComplianceEvent> => {
  const response = await apiClient.post<ComplianceEvent>('/compliance/', data);
  return response.data;
};

export const completeComplianceEvent = async (id: string): Promise<ComplianceEvent> => {
  const response = await apiClient.put<ComplianceEvent>(`/compliance/${id}/complete`);
  return response.data;
};

// Corrective Actions Workflow
export const getCorrectiveActions = async (
  mineId?: string,
  status?: string,
  isEscalated?: boolean,
  inspectionId?: string
): Promise<CorrectiveAction[]> => {
  const params: Record<string, any> = {};
  if (mineId) params.mine_id = mineId;
  if (status) params.status = status;
  if (isEscalated !== undefined) params.is_escalated = isEscalated;
  if (inspectionId) params.inspection_id = inspectionId;
  const response = await apiClient.get<CorrectiveAction[]>('/actions/', { params });
  return response.data;
};

export const createCorrectiveAction = async (data: {
  mine_id: string;
  inspection_id?: string | null;
  alert_id?: string | null;
  title: string;
  description?: string;
  assigned_to_name?: string;
  deadline: string;
  priority?: string;
}): Promise<CorrectiveAction> => {
  const response = await apiClient.post<CorrectiveAction>('/actions/', data);
  return response.data;
};

export const updateCorrectiveAction = async (
  id: string,
  data: {
    status?: string;
    is_escalated?: boolean;
    escalation_reason?: string;
    closure_evidence?: string;
  }
): Promise<CorrectiveAction> => {
  const response = await apiClient.put<CorrectiveAction>(`/actions/${id}`, data);
  return response.data;
};

// Audit Trail
export const getAuditLogs = async (
  mineId?: string,
  entityType?: string,
  entityId?: string
): Promise<AuditLog[]> => {
  const params: Record<string, string> = {};
  if (mineId) params.mine_id = mineId;
  if (entityType) params.entity_type = entityType;
  if (entityId) params.entity_id = entityId;
  const response = await apiClient.get<AuditLog[]>('/audit/', { params });
  return response.data;
};

// Risk Analytics
export const getRiskAnalytics = async (): Promise<RiskAnalytics> => {
  const response = await apiClient.get<RiskAnalytics>('/analytics/risk');
  return response.data;
};

// Export CSV URL helper
export const getExportCsvUrl = (mineId?: string, reportType: string = 'inspections'): string => {
  const query = new URLSearchParams();
  if (mineId) query.append('mine_id', mineId);
  query.append('report_type', reportType);
  return `/api/v1/reports/export-csv?${query.toString()}`;
};
