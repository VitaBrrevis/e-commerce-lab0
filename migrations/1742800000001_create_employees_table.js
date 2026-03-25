export const up = (pgm) => {
  pgm.createTable(
    'employees',
    {
      id: 'id',
      name: { type: 'varchar(255)', notNull: true },
      position: { type: 'varchar(255)', notNull: true },
      department: { type: 'varchar(255)', notNull: true },
      hired_at: {
        type: 'date',
        notNull: true,
        default: pgm.func('current_date'),
      },
    },
    { ifNotExists: true }
  );
};

export const down = (pgm) => {
  pgm.dropTable('employees', { ifExists: true });
};
