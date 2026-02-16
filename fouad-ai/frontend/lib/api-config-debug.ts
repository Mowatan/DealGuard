/**
 * API Configuration Debugging Helper
 *
 * Use this in browser console to debug API configuration issues:
 *
 * import { debugApiConfig } from '@/lib/api-config-debug';
 * debugApiConfig();
 */

export function debugApiConfig() {
  const config = {
    // Environment
    nodeEnv: process.env.NODE_ENV,
    isClient: typeof window !== 'undefined',

    // API Configuration
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',

    // Clerk Configuration
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    isClerkTest: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'),
    isClerkLive: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_'),

    // Current Location (client-side only)
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A (server)',
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A (server)',
  };

  console.group('🔍 API Configuration Debug Info');
  console.log('Environment:', config.nodeEnv);
  console.log('Running on:', config.isClient ? 'Client' : 'Server');
  console.log('');

  console.log('📡 API Base URL:', config.apiBaseUrl);
  console.log('🔐 Clerk Key:', config.clerkPublishableKey?.substring(0, 20) + '...');
  console.log('🔐 Clerk Mode:', config.isClerkTest ? '❌ TEST MODE' : config.isClerkLive ? '✅ LIVE MODE' : '⚠️ UNKNOWN');
  console.log('');

  if (config.isClient) {
    console.log('🌐 Current Origin:', config.currentOrigin);
    console.log('🌐 Current URL:', config.currentUrl);
  }

  console.log('');
  console.log('⚠️ Issues Detected:');
  const issues: string[] = [];

  // Check for production issues
  if (config.nodeEnv === 'production') {
    if (config.isClerkTest) {
      issues.push('❌ Using TEST Clerk keys in production!');
    }
    if (config.apiBaseUrl.includes('localhost')) {
      issues.push('❌ API URL points to localhost in production!');
    }
  }

  // Check for common misconfigurations
  if (!config.apiBaseUrl.startsWith('http')) {
    issues.push('❌ API URL is malformed (missing http/https)');
  }
  if (config.apiBaseUrl.endsWith('/')) {
    issues.push('⚠️ API URL has trailing slash (might cause issues)');
  }

  if (issues.length === 0) {
    console.log('✅ No obvious issues detected');
  } else {
    issues.forEach(issue => console.log(issue));
  }

  console.groupEnd();

  return config;
}

/**
 * Test API connection from browser console
 *
 * Usage:
 * import { testApiConnection } from '@/lib/api-config-debug';
 * await testApiConnection();
 */
export async function testApiConnection() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const healthUrl = `${apiUrl}/health`;

  console.group('🧪 Testing API Connection');
  console.log('Testing:', healthUrl);

  try {
    const startTime = Date.now();
    const response = await fetch(healthUrl);
    const duration = Date.now() - startTime;

    console.log('✅ Response received:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'content-type': response.headers.get('content-type'),
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response data:', data);
      console.log('');
      console.log('🎉 API connection successful!');
    } else {
      console.error('❌ API returned error status:', response.status);
    }

    return response;
  } catch (error: any) {
    console.error('❌ Connection failed:', {
      error: error.message,
      name: error.name,
      type: error.constructor.name,
    });
    console.log('');
    console.log('💡 Possible causes:');
    console.log('  1. API server is down or not responding');
    console.log('  2. CORS is not configured correctly');
    console.log('  3. DNS resolution failed for API domain');
    console.log('  4. Network/firewall blocking the request');
    console.log('  5. Wrong API URL in environment variables');
    console.log('');
    console.log('🔍 Check:');
    console.log(`  - Can you open ${apiUrl}/health in a new browser tab?`);
    console.log('  - Is the backend deployed and running?');
    console.log('  - Is CORS configured with your frontend domain?');

    throw error;
  } finally {
    console.groupEnd();
  }
}

/**
 * Get current auth token from Clerk (client-side only)
 *
 * Usage in React component:
 * const { getToken } = useAuth();
 * const token = await getToken();
 * testAuthenticatedRequest(token);
 */
export async function testAuthenticatedRequest(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const testUrl = `${apiUrl}/api/users/me`;

  console.group('🔐 Testing Authenticated API Request');
  console.log('Testing:', testUrl);
  console.log('Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');

  if (!token) {
    console.error('❌ No token provided. User might not be signed in.');
    console.groupEnd();
    return;
  }

  try {
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Response:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ User data:', data);
      console.log('🎉 Authentication successful!');
    } else if (response.status === 401) {
      console.error('❌ Unauthorized - Token might be invalid or expired');
    } else {
      console.error('❌ Request failed:', response.statusText);
    }

    return response;
  } catch (error: any) {
    console.error('❌ Request failed:', error.message);
    throw error;
  } finally {
    console.groupEnd();
  }
}
