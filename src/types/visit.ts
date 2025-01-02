export interface VisitType{
    id: number;
    startDateTime: string;
    collectorId: string;
    collector: any;
    endDateTime: string;
    status: string;
    managerId: string;
    manager: any;
    notes: string;
    payments: any[];
}