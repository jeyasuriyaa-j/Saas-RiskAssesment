import api from './api';

export interface Evidence {
    id: string;
    file_name: string;
    uploaded_at: string;
    uploaded_by: string;
}

export interface SOC2Report {
    summary: {
        total_criteria: number;
        covered_criteria: number;
        fully_auditable: number;
        coverage_percent: number;
    };
    details: {
        criteria: string;
        description: string;
        mapped_risks_count: number;
        mapped_controls_count: number;
        evidence_count: number;
        status: 'AUDIT_READY' | 'IMPLEMENTED' | 'NOT_COVERED';
    }[];
}

export const evidenceService = {
    upload: async (controlId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('controlId', controlId);

        const response = await api.post('/evidence/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    listByControl: async (controlId: string) => {
        const response = await api.get<Evidence[]>(`/evidence/control/${controlId}`);
        return response.data;
    },

    delete: async (evidenceId: string) => {
        await api.delete(`/evidence/${evidenceId}`);
    }
};

export const reportService = {
    getSOC2Coverage: async () => {
        const response = await api.get<SOC2Report>('/reports/soc2-coverage');
        return response.data;
    }
};
