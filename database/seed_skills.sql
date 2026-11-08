INSERT INTO skills (name) VALUES
  ('c'),
  ('c++'),
  ('java'),
  ('javascript'),
  ('typescript'),
  ('python'),
  ('sql'),
  ('postgresql'),
  ('react'),
  ('node.js'),
  ('docker'),
  ('aws'),
  ('machine learning'),
  ('data analysis')
ON CONFLICT (name) DO NOTHING;
