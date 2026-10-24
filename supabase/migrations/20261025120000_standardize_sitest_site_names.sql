-- Normalize the legacy spelling to match the bus travel-time matrix.
update public.conducts
set sit_test_site = case sit_test_site
  when 'Sittest Site 1' then 'Sitest Site 1'
  when 'Sittest Site 2' then 'Sitest Site 2'
end
where sit_test_site in ('Sittest Site 1', 'Sittest Site 2');
