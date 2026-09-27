-- Configurable Stage 1 / Stage 2 preparation indicator weights.
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO scoring_rules
(id,version_id,rule_key,label,weight,config_json,is_active)
VALUES
('SR-S1-REQ','VER-ISO27001-2022-RTI-1','stage1_requirement','Stage 1 - ISMS requirement readiness',0.70,'{"clauses":["4","5","6","7"]}',1),
('SR-S1-GATE','VER-ISO27001-2022-RTI-1','stage1_gates','Stage 1 - readiness gates',0.30,'{"gates":[1,2,3,4,5]}',1),
('SR-S2-REQ','VER-ISO27001-2022-RTI-1','stage2_requirement','Stage 2 - operational requirement readiness',0.35,'{"clauses":["8","9","10"]}',1),
('SR-S2-CTRL','VER-ISO27001-2022-RTI-1','stage2_controls','Stage 2 - control readiness',0.25,'{"source":"control_readiness"}',1),
('SR-S2-EVID','VER-ISO27001-2022-RTI-1','stage2_evidence','Stage 2 - evidence readiness',0.15,'{"source":"evidence_readiness"}',1),
('SR-S2-GATE','VER-ISO27001-2022-RTI-1','stage2_gates','Stage 2 - readiness gates',0.25,'{"gates":[6,7,8,9,10]}',1);
