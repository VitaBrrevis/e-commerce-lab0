export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO employees (name, position, department, hired_at)
    SELECT v.name, v.position, v.department, v.hired_at::date
    FROM (VALUES
      ('Alice Johnson',  'Software Engineer',   'Engineering', '2023-03-15'),
      ('Bob Smith',      'Product Manager',     'Product',     '2022-07-01'),
      ('Carol Williams', 'UX Designer',         'Design',      '2023-09-20'),
      ('David Brown',    'DevOps Engineer',     'Engineering', '2021-11-05'),
      ('Eva Martinez',   'Data Analyst',        'Analytics',   '2024-01-10')
    ) AS v(name, position, department, hired_at)
    WHERE NOT EXISTS (SELECT 1 FROM employees LIMIT 1);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM employees
    WHERE name IN (
      'Alice Johnson',
      'Bob Smith',
      'Carol Williams',
      'David Brown',
      'Eva Martinez'
    );
  `);
};
