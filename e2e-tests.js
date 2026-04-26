/**
 * E2E Tests for Catan Leaderboard Web App
 * Run with: node e2e-tests.js
 * 
 * Requires playwright: npm install playwright
 */

const { chromium } = require('playwright');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const RESULTS = [];

function log(test, pass, msg = '') {
  const status = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${test}${msg ? ' - ' + msg : ''}`);
  RESULTS.push({ test, pass, msg });
}

// Test 1: Login
async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    log('Login', page.url() === BASE_URL + '/');
  } catch (e) {
    log('Login', false, e.message);
  }
  await browser.close();
}

// Test 2: Calendar List
async function testCalendarList() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    log('Calendar List', page.url().includes('calendar'));
  } catch (e) {
    log('Calendar List', false, e.message);
  }
  await browser.close();
}

// Test 3: Calendar Create (logged in)
async function testCalendarCreate() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to calendar and create
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const createBtn = page.locator('button:has-text("Agendar")').first();
    const dialogOpen = await createBtn.isVisible().then(async (v) => {
      if (v) await createBtn.click();
      await page.waitForTimeout(500);
      return page.locator('[role="dialog"]').isVisible();
    });
    
    log('Calendar Create', dialogOpen);
  } catch (e) {
    log('Calendar Create', false, e.message);
  }
  await browser.close();
}

// Test 4: Submit Page
async function testSubmit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${BASE_URL}/submit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const formExists = await page.locator('form').count() > 0;
    log('Submit Page', formExists);
  } catch (e) {
    log('Submit Page', false, e.message);
  }
  await browser.close();
}

// Test 5: Profile Page
async function testProfile() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const hasContent = (await page.content()).includes('admin');
    log('Profile Page', hasContent);
  } catch (e) {
    log('Profile Page', false, e.message);
  }
  await browser.close();
}

// Test 6: Admin Page
async function testAdmin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    log('Admin Page', page.url().includes('admin'));
  } catch (e) {
    log('Admin Page', false, e.message);
  }
  await browser.close();
}

// Test 7: Match Details
async function testMatchDetails() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const matchesRes = await fetch(`${BASE_URL}/api/v1/matches`);
    const matches = await matchesRes.json();
    
    if (matches.length === 0) {
      log('Match Details', true, 'SKIP - no matches');
      await browser.close();
      return;
    }
    
    await page.goto(`${BASE_URL}/matches/${matches[0].id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    log('Match Details', page.url().includes(matches[0].id));
  } catch (e) {
    log('Match Details', false, e.message);
  }
  await browser.close();
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Catan Leaderboard E2E Tests\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('='.repeat(40));
  
  await testLogin();
  await testCalendarList();
  await testCalendarCreate();
  await testSubmit();
  await testProfile();
  await testAdmin();
  await testMatchDetails();
  
  console.log('\n' + '='.repeat(40));
  const passed = RESULTS.filter(r => r.pass).length;
  const failed = RESULTS.filter(r => !r.pass).length;
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    RESULTS.filter(r => !r.pass).forEach(r => console.log(`  - ${r.test}: ${r.msg}`));
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);