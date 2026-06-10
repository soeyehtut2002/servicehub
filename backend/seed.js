require('dotenv').config({ path: './.env' });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({ connectionString: process.env.DATABASE_URL });

const providers = [
  { name: 'Alex Johnson', email: 'alex.provider@example.com', phone: '+1-555-0101', location: 'New York, NY', bio: 'Professional handyman with 10 years of experience in home repairs and renovations.', account_type: 'freelancer' },
  { name: 'Maria Garcia', email: 'maria.provider@example.com', phone: '+1-555-0102', location: 'Los Angeles, CA', bio: 'Expert cleaning specialist and home organizer. Passionate about creating spotless spaces.', account_type: 'business' },
  { name: 'David Chen', email: 'david.provider@example.com', phone: '+1-555-0103', location: 'Chicago, IL', bio: 'Licensed electrician and plumber. Certified for all residential and commercial work.', account_type: 'freelancer' },
  { name: 'Sarah Williams', email: 'sarah.provider@example.com', phone: '+1-555-0104', location: 'Houston, TX', bio: 'Professional gardener and landscaper. Creating beautiful outdoor spaces since 2010.', account_type: 'business' },
];

const customers = [
  { name: 'John Smith', email: 'john.smith@example.com', phone: '+1-555-0201', location: 'Brooklyn, NY' },
  { name: 'Emily Davis', email: 'emily.davis@example.com', phone: '+1-555-0202', location: 'Santa Monica, CA' },
  { name: 'Michael Brown', email: 'michael.brown@example.com', phone: '+1-555-0203', location: 'Naperville, IL' },
  { name: 'Jessica Wilson', email: 'jessica.wilson@example.com', phone: '+1-555-0204', location: 'Sugar Land, TX' },
  { name: 'Chris Martinez', email: 'chris.martinez@example.com', phone: '+1-555-0205', location: 'Queens, NY' },
  { name: 'Ashley Taylor', email: 'ashley.taylor@example.com', phone: '+1-555-0206', location: 'Pasadena, CA' },
  { name: 'Ryan Anderson', email: 'ryan.anderson@example.com', phone: '+1-555-0207', location: 'Evanston, IL' },
  { name: 'Amanda Thomas', email: 'amanda.thomas@example.com', phone: '+1-555-0208', location: 'Austin, TX' },
  { name: 'Kevin Jackson', email: 'kevin.jackson@example.com', phone: '+1-555-0209', location: 'Manhattan, NY' },
  { name: 'Lauren White', email: 'lauren.white@example.com', phone: '+1-555-0210', location: 'San Diego, CA' },
];

// 20 services spread across 4 providers (5 each)
const serviceTemplates = [
  // Alex Johnson - Handyman (provider index 0)
  { title: 'General Home Repair', description: 'Fix anything in your home — leaky faucets, broken doors, drywall patching, furniture assembly and more. Fast, reliable, and affordable.', category: 'Handyman', location: 'New York, NY', price: 75, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Furniture Assembly', description: 'Expert assembly of all flat-pack furniture including IKEA, Wayfair, Amazon. All tools provided. Quick and clean service.', category: 'Handyman', location: 'New York, NY', price: 60, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Painting & Touch-ups', description: 'Interior wall painting, touch-ups, and small paint jobs. Quality materials, clean finish, and no mess left behind.', category: 'Painting', location: 'New York, NY', price: 120, duration_hours: 4, team_count: 1, currency: 'USD' },
  { title: 'TV Mounting Service', description: 'Professional TV wall mounting for all screen sizes. Includes cable management and wall repair if needed.', category: 'Handyman', location: 'New York, NY', price: 90, duration_hours: 1, team_count: 1, currency: 'USD' },
  { title: 'Smart Home Installation', description: 'Setup and install smart home devices — thermostats, doorbells, locks, cameras, and speakers. Full configuration included.', category: 'Tech', location: 'New York, NY', price: 150, duration_hours: 3, team_count: 1, currency: 'USD' },

  // Maria Garcia - Cleaning (provider index 1)
  { title: 'Standard Home Cleaning', description: 'Thorough cleaning of your home including kitchen, bathrooms, bedrooms and living areas. Eco-friendly products used.', category: 'Cleaning', location: 'Los Angeles, CA', price: 120, duration_hours: 3, team_count: 2, currency: 'USD' },
  { title: 'Deep Cleaning Service', description: 'Comprehensive deep clean including appliances, baseboards, window sills, and hard-to-reach areas. Perfect for move-in/out.', category: 'Cleaning', location: 'Los Angeles, CA', price: 220, duration_hours: 6, team_count: 2, currency: 'USD' },
  { title: 'Office Cleaning', description: 'Professional office cleaning service for small to medium businesses. Flexible scheduling including evenings and weekends.', category: 'Cleaning', location: 'Los Angeles, CA', price: 180, duration_hours: 4, team_count: 3, currency: 'USD' },
  { title: 'Post-Party Cleanup', description: 'Quick and efficient post-event cleanup. We handle trash removal, surface cleaning, and restoring your space to its original state.', category: 'Cleaning', location: 'Los Angeles, CA', price: 160, duration_hours: 3, team_count: 2, currency: 'USD' },
  { title: 'Home Organization', description: 'Professional decluttering and organization for closets, kitchens, garages, and any room. Includes labeling and storage solutions.', category: 'Organization', location: 'Los Angeles, CA', price: 95, duration_hours: 3, team_count: 1, currency: 'USD' },

  // David Chen - Electrical & Plumbing (provider index 2)
  { title: 'Electrical Repairs', description: 'Licensed electrician for outlet installation, circuit breaker issues, lighting fixtures, and all electrical troubleshooting.', category: 'Electrical', location: 'Chicago, IL', price: 100, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Plumbing Services', description: 'Fix leaks, unclog drains, replace faucets, install toilets and showers. All plumbing work guaranteed for 90 days.', category: 'Plumbing', location: 'Chicago, IL', price: 110, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Water Heater Installation', description: 'Professional installation and replacement of water heaters — tank and tankless. Includes disposal of old unit.', category: 'Plumbing', location: 'Chicago, IL', price: 350, duration_hours: 4, team_count: 2, currency: 'USD' },
  { title: 'Ceiling Fan Installation', description: 'Install or replace ceiling fans with or without existing wiring. Safety-certified and fully insured.', category: 'Electrical', location: 'Chicago, IL', price: 85, duration_hours: 1, team_count: 1, currency: 'USD' },
  { title: 'Home Inspection', description: 'Comprehensive home inspection covering electrical, plumbing, HVAC basics, and structural concerns. Detailed report provided.', category: 'Inspection', location: 'Chicago, IL', price: 250, duration_hours: 3, team_count: 1, currency: 'USD' },

  // Sarah Williams - Gardening & Landscaping (provider index 3)
  { title: 'Lawn Mowing & Edging', description: 'Professional lawn mowing, edging, and trimming. Leaves your yard looking neat and well-maintained every time.', category: 'Gardening', location: 'Houston, TX', price: 65, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Garden Design & Planting', description: 'Custom garden design and planting service. We source plants suited to your climate and aesthetic preferences.', category: 'Gardening', location: 'Houston, TX', price: 200, duration_hours: 5, team_count: 2, currency: 'USD' },
  { title: 'Tree Trimming & Pruning', description: 'Safe and professional tree trimming, branch removal, and hedge pruning. Debris hauled away at no extra cost.', category: 'Landscaping', location: 'Houston, TX', price: 175, duration_hours: 4, team_count: 2, currency: 'USD' },
  { title: 'Irrigation System Setup', description: 'Design and install drip or sprinkler irrigation systems for lawns and gardens. Includes controller programming.', category: 'Landscaping', location: 'Houston, TX', price: 300, duration_hours: 6, team_count: 2, currency: 'USD' },
  { title: 'Seasonal Garden Cleanup', description: 'Spring or fall garden cleanup — clearing leaves, cutting back perennials, mulching beds, and prepping for the next season.', category: 'Gardening', location: 'Houston, TX', price: 130, duration_hours: 3, team_count: 2, currency: 'USD' },
];

async function seed() {
  await client.connect();
  console.log('Connected to database\n');

  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);

  // Insert providers
  console.log('Creating providers...');
  const providerIds = [];
  for (const p of providers) {
    const res = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone, location, bio, account_type, is_verified)
       VALUES ($1, $2, $3, 'provider', $4, $5, $6, $7, true)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [p.name, p.email, hash, p.phone, p.location, p.bio, p.account_type]
    );
    providerIds.push(res.rows[0].id);
    console.log(`  ✅ Provider: ${p.name} (${p.email})`);
  }

  // Insert customers
  console.log('\nCreating customers...');
  for (const c of customers) {
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone, location, is_verified)
       VALUES ($1, $2, $3, 'customer', $4, $5, true)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name`,
      [c.name, c.email, hash, c.phone, c.location]
    );
    console.log(`  ✅ Customer: ${c.name} (${c.email})`);
  }

  // Insert services (5 per provider)
  console.log('\nCreating services...');
  for (let i = 0; i < serviceTemplates.length; i++) {
    const s = serviceTemplates[i];
    const providerIdx = Math.floor(i / 5);
    const providerId = providerIds[providerIdx];
    await client.query(
      `INSERT INTO services (provider_id, title, description, category, location, price, duration_hours, team_count, currency, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [providerId, s.title, s.description, s.category, s.location, s.price, s.duration_hours, s.team_count, s.currency]
    );
    console.log(`  ✅ Service: ${s.title} (by provider ${providerIdx + 1})`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\nAll accounts use password: password123');
  console.log('\nProvider accounts:');
  providers.forEach(p => console.log(`  ${p.email}`));
  console.log('\nCustomer accounts:');
  customers.forEach(c => console.log(`  ${c.email}`));

  await client.end();
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
