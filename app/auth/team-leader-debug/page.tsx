"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, AlertCircle } from "lucide-react";

interface TeamLeaderCheckResult {
  currentUser: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
  };
  isTeamLeader: boolean;
  teamsAsLeader: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    leaderId: string;
  }>;
  teamsAsMember: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  allTeamsInSystem: Array<{
    id: string;
    name: string;
    leaderId: string;
    isActive: boolean;
    leader: {
      id: string;
      email: string;
      displayName: string | null;
      role: string;
    };
  }>;
  debug: {
    message: string;
  };
}

export default function TeamLeaderDebugPage() {
  const [result, setResult] = useState<TeamLeaderCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTeamLeaderStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/debug/team-leader-check');
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to check team leader status');
        return;
      }
      
      setResult(data);
    } catch (err) {
      console.error('Error checking team leader status:', err);
      setError('Failed to check team leader status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTeamLeaderStatus();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Leader Access Debug</h1>
            <p className="text-muted-foreground">Check your team leader status and permissions</p>
          </div>
          <Button onClick={checkTeamLeaderStatus} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            {/* Current User Info */}
            <Card>
              <CardHeader>
                <CardTitle>Current User</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Email:</strong> {result.currentUser.email}</div>
                <div><strong>Role:</strong> <Badge>{result.currentUser.role}</Badge></div>
                <div><strong>Name:</strong> {result.currentUser.displayName || 'N/A'}</div>
                <div><strong>User ID:</strong> <code className="bg-muted px-2 py-1 rounded text-xs">{result.currentUser.id}</code></div>
              </CardContent>
            </Card>

            {/* Team Leader Status */}
            <Card className={result.isTeamLeader ? "border-green-500" : "border-yellow-500"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Leader Status</CardTitle>
                  {result.isTeamLeader ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Team Leader
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not a Team Leader
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{result.debug.message}</p>
                {!result.isTeamLeader && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">Access Issue</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          You need to be assigned as a team leader to access team management features. 
                          Please contact an administrator to assign you as a team leader.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teams as Leader */}
            {result.teamsAsLeader.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Teams You Lead ({result.teamsAsLeader.length})</CardTitle>
                  <CardDescription>Teams where you are the team leader</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.teamsAsLeader.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-muted-foreground">{team.slug}</div>
                        </div>
                        <Badge variant={team.isActive ? "default" : "secondary"}>
                          {team.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teams as Member */}
            {result.teamsAsMember.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Teams You're Member Of ({result.teamsAsMember.length})</CardTitle>
                  <CardDescription>Teams where you are a regular member</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.teamsAsMember.map((team) => (
                      <div key={team.id} className="p-2 border rounded-md">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">{team.slug}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Teams (for debugging) */}
            <Card>
              <CardHeader>
                <CardTitle>All Teams in System ({result.allTeamsInSystem.length})</CardTitle>
                <CardDescription>For debugging purposes - showing all teams and their leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.allTeamsInSystem.map((team) => (
                    <div key={team.id} className="p-3 border rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{team.name}</div>
                        <Badge variant={team.isActive ? "default" : "secondary"}>
                          {team.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <strong>Leader:</strong> {team.leader.displayName || team.leader.email}
                        <Badge variant="outline" className="ml-2">{team.leader.role}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Leader ID: {team.leaderId}
                      </div>
                      {team.leaderId === result.currentUser.id && (
                        <Badge className="bg-green-500">You are the leader!</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
