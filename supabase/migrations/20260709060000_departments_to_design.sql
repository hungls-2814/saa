-- F005/F006 follow-up: the seed departments (CECV2/CEVC10/DXC1/QAQC2, with a
-- CECV/CEVC typo) didn't match the design's department filter
-- (Dropdown Phòng ban WXK5AYB_rG: CEVC2, CEVC3, CEVC4, CEVC1, OPD, Infra).
--
-- Rename the four existing seed departments to the design names — a rename keeps
-- the department_id, so every profile stays linked to its (now correctly-named)
-- department, no re-seed needed. Then add the two department-only entries (OPD,
-- Infra) that appear in the dropdown but have no seeded members yet.
--
-- Idempotent: each rename is a no-op when the old name is absent (e.g. a fresh DB
-- seeded with the updated names), and the inserts skip on the unique-name conflict.
update departments set name = 'CEVC2' where name = 'CECV2';
update departments set name = 'CEVC3' where name = 'CEVC10';
update departments set name = 'CEVC4' where name = 'DXC1';
update departments set name = 'CEVC1' where name = 'QAQC2';

insert into departments (name) values ('OPD'), ('Infra')
on conflict (name) do nothing;
