"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface CheckResult {
  supabase: {
    authenticated: boolean;
    id?: string;
    email?: string;
    confirmed_at?: string;
    created_at?: string;
    user_metadata?: any;
    error?: string;
  };
  database: {
    exists: boolean;
    id?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    firstName?: string;
    lastName?: string;
    employeeId?: string;
    createdAt?: string;
    message?: string;
  } | null;
}

export default function AuthDebugPage() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const checkUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/check-user');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncUser = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/auth/sync-user', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        alert('User synced successfully! Refreshing...');
        await checkUser();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error syncing user:', error);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auth Debug</h1>
            <p className="text-muted-foreground">Check authentication status and sync users</p>
          </div>
          <Button onClick={checkUser} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {result && (
          <>
            {/* Supabase Auth Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Supabase Auth</CardTitle>
                  {result.supabase.authenticated ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Authenticated
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Authenticated
                    </Badge>
                  )}
                </div>
                <CardDescription>Status in Supabase Authentication</CardDescription>
              </CardHeader>
              <CardContent>
                {result.supabase.authenticated ? (
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> <code className="bg-muted px-2 py-1 rounded">{result.supabase.id}</code></div>
                    <div><strong>Email:</strong> {result.supabase.email}</div>
                    <div><strong>Confirmed At:</strong> {result.supabase.confirmed_at || 'Not confirmed'}</div>
                    <div><strong>Created At:</strong> {result.supabase.created_at}</div>
                    {result.supabase.user_metadata && (
                      <div>
                        <strong>Metadata:</strong>
                        <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-auto">
                          {JSON.stringify(result.supabase.user_metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    {result.supabase.error || 'No active session. Please log in.'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Database Record</CardTitle>
                  {result.database?.exists ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Exists
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Found
                    </Badge>
                  )}
                </div>
                <CardDescription>Status in application database</CardDescription>
              </CardHeader>
              <CardContent>
                {result.database?.exists ? (
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> <code className="bg-muted px-2 py-1 rounded">{result.database.id}</code></div>
                    <div><strong>Email:</strong> {result.database.email}</div>
                    <div><strong>Role:</strong> <Badge>{result.database.role}</Badge></div>
                    <div><strong>Active:</strong> {result.database.isActive ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>Name:</strong> {result.database.firstName} {result.database.lastName}</div>
                    {result.database.employeeId && (
                      <div><strong>Employee ID:</strong> {result.database.employeeId}</div>
                    )}
                    <div><strong>Created At:</strong> {result.database.createdAt}</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-muted-foreground">
                      {result.database?.message || 'User record not found in database'}
                    </div>
                    {result.supabase.authenticated && (
                      <Button onClick={syncUser} disabled={syncing}>
                        {syncing ? 'Syncing...' : 'Sync User to Database'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Summary */}
            <Card className={
              result.supabase.authenticated && result.database?.exists
                ? "border-green-500"
                : "border-yellow-500"
            }>
              <CardHeader>
                <CardTitle>Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {result.supabase.authenticated && result.database?.exists ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Everything is working correctly!</span>
                  </div>
                ) : result.supabase.authenticated && !result.database?.exists ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">User needs to be synced to database</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You're authenticated in Supabase but your profile hasn't been created in the database yet.
                      Click "Sync User to Database" above to fix this.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Not authenticated</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please log in to see your authentication status.
                    </p>
                    <Button asChild>
                      <a href="/auth/login">Go to Login</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
