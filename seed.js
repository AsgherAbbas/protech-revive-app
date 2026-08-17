const { getDb, runAsync, getAsync } = require('./lib/db');

async function seedDatabase() {
  try {
    const db = await getDb();

    await runAsync('DELETE FROM staff_output');
    await runAsync('DELETE FROM attendance');
    await runAsync('DELETE FROM sales');
    await runAsync('DELETE FROM prices');
    await runAsync('DELETE FROM users');
    await runAsync('DELETE FROM companies');

    const protechResult = await new Promise((resolve, reject) => {
      db.run('INSERT INTO companies (name) VALUES (?)', ['PROtech'], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    const protechId = protechResult.lastID;

    const reviveResult = await new Promise((resolve, reject) => {
      db.run('INSERT INTO companies (name) VALUES (?)', ['Revive'], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    const reviveId = reviveResult.lastID;

    const users = [
      { name: 'Boss PROtech', email: 'boss@protechfzco.ae', password: 'abcd@123', status: 'approved', company_id: protechId, role: 'super_admin' },
      { name: 'Boss Revive', email: 'boss@revivetech.ae', password: 'abcd@123', status: 'approved', company_id: reviveId, role: 'super_admin' },
      { name: 'Abbas', email: 'abbas@protech.com', status: 'approved', company_id: protechId, role: 'price_manager' },
      { name: 'Omar', email: 'omar@protech.com', status: 'approved', company_id: protechId, role: 'operations' },
      { name: 'Aqeel', email: 'aqeel.protech@protech.com', status: 'approved', company_id: protechId, role: 'operations' },
      { name: 'Aqeel', email: 'aqeel.revive@revive.com', status: 'approved', company_id: reviveId, role: 'attendance_inventory' },
      { name: 'Javed', email: 'javed@revive.com', status: 'approved', company_id: reviveId, role: 'sales_manager' },
      { name: 'Munir', email: 'munir@revive.com', status: 'approved', company_id: reviveId, role: 'staff_output' }
    ];

    for (const user of users) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (name, email, password, company_id, role, status) VALUES (?, ?, ?, ?, ?, ?)',
          [user.name, user.email.toLowerCase(), user.password || '123456', user.company_id, user.role, user.status || 'active'],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    console.log('✅ Database seeded successfully');
    console.log(`Companies: PROtech (ID: ${protechId}), Revive (ID: ${reviveId})`);
    console.log('Users inserted: 8 users across 2 companies');
    console.log('Boss accounts password: abcd@123');
    console.log('All non-boss users have default password: 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
