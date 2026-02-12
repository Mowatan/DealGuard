require('dotenv').config();

console.log('Environment variables check:');
console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? `${process.env.CLERK_SECRET_KEY.substring(0, 15)}...` : 'NOT SET');
console.log('CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? `${process.env.CLERK_PUBLISHABLE_KEY.substring(0, 15)}...` : 'NOT SET');
console.log('Full CLERK_SECRET_KEY length:', process.env.CLERK_SECRET_KEY?.length || 0);
