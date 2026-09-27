-- Parameterized Statement of Applicability choices.
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO system_parameters
(group_key,value,label,description,sort_order,is_active,is_system,updated_at)
VALUES
('iso27001.applicability','applicable','Applicable','Control is applicable to the assessed ISMS scope and risk context.',10,1,1,CURRENT_TIMESTAMP),
('iso27001.applicability','not_applicable','Not Applicable','Control is excluded with documented risk and applicability justification.',20,1,1,CURRENT_TIMESTAMP);
