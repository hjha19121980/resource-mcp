import type { EmployeeRepository } from "../database/repositories/employeeRepository.js";
import type { ManagerReport } from "../types/resourceTypes.js";

export class HierarchyService {
  constructor(private readonly employees: EmployeeRepository) {}

  async getDirectReports(managerName: string): Promise<{ manager: string; reports: ManagerReport[] }> {
    const directReports = await this.employees.findDirectReports(managerName);
    return {
      manager: managerName,
      reports: directReports.map((report) => ({
        employee: `${report.firstName} ${report.lastName}`,
        designation: report.designation
      }))
    };
  }
}
