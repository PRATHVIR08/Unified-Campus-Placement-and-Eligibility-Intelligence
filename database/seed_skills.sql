INSERT INTO skills (name) VALUES
  ('c'), ('c++'), ('java'), ('javascript'), ('typescript'), ('python'), ('sql'),
  ('postgresql'), ('mysql'), ('mongodb'), ('react'), ('angular'), ('vue'),
  ('node.js'), ('express'), ('html'), ('css'), ('bootstrap'), ('tailwind'),
  ('git'), ('github'), ('docker'), ('kubernetes'), ('aws'), ('azure'), ('gcp'),
  ('machine learning'), ('data analysis'), ('data structures'), ('algorithms'),
  ('django'), ('flask'), ('spring boot'), ('rest apis'), ('graphql'),
  ('linux'), ('pandas'), ('numpy'), ('tensorflow'), ('pytorch'),
  ('tableau'), ('power bi'), ('cybersecurity')
ON CONFLICT (name) DO NOTHING;
