CREATE TABLE IF NOT EXISTS employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number VARCHAR(100) UNIQUE,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email VARCHAR(320) UNIQUE,
    department VARCHAR(200),
    designation VARCHAR(200),
    location VARCHAR(200),
    manager_name VARCHAR(301),
    availability_percentage INTEGER NOT NULL DEFAULT 0
        CHECK (availability_percentage BETWEEN 0 AND 100),
    employee_status VARCHAR(50) NOT NULL DEFAULT 'active',
    hire_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    skill_name VARCHAR(200) NOT NULL,
    proficiency_level VARCHAR(50) NOT NULL DEFAULT 'beginner',
    years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
    last_used_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_experience (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    project_name VARCHAR(300) NOT NULL,
    role_name VARCHAR(200),
    start_date DATE,
    end_date DATE,
    project_description TEXT
);

CREATE INDEX IF NOT EXISTS idx_employees_status_availability
    ON employees (employee_status, availability_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_employees_manager_name
    ON employees (lower(manager_name));
CREATE INDEX IF NOT EXISTS idx_employees_department_location
    ON employees (department, location);
CREATE INDEX IF NOT EXISTS idx_employee_skills_name
    ON employee_skills (lower(skill_name));
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee
    ON employee_skills (employee_id);
CREATE INDEX IF NOT EXISTS idx_project_experience_name
    ON project_experience (lower(project_name));
CREATE INDEX IF NOT EXISTS idx_project_experience_employee
    ON project_experience (employee_id);
