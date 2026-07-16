import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Trash2, Search, Loader2 } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export function DebugAliasManager() {
  const [aliasToCheck, setAliasToCheck] = useState("");
  const [aliasToDelete, setAliasToDelete] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCheckAlias = async () => {
    if (!aliasToCheck.trim()) return;
    
    setIsChecking(true);
    setCheckResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/debug/alias/${encodeURIComponent(aliasToCheck.trim())}`,
        {
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const data = await response.json();
      setCheckResult(data);
    } catch (error) {
      console.error("Error checking alias:", error);
      setCheckResult({ error: "Failed to check alias" });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteAlias = async () => {
    if (!aliasToDelete.trim()) return;
    
    setIsDeleting(true);
    setDeleteResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/debug/alias/${encodeURIComponent(aliasToDelete.trim())}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const data = await response.json();
      setDeleteResult(data);
      
      if (data.success) {
        setAliasToDelete("");
      }
    } catch (error) {
      console.error("Error deleting alias:", error);
      setDeleteResult({ error: "Failed to delete alias" });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSpecificAlias = async (alias: string) => {
    setAliasToDelete(alias);
    setIsDeleting(true);
    setDeleteResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/debug/alias/${encodeURIComponent(alias)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const data = await response.json();
      setDeleteResult(data);
    } catch (error) {
      console.error("Error deleting alias:", error);
      setDeleteResult({ error: "Failed to delete alias" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAutoCleanup = async () => {
    setIsDeleting(true);
    setDeleteResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/cleanup-orphaned-aliases`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const data = await response.json();
      setDeleteResult(data);
    } catch (error) {
      console.error("Error during auto cleanup:", error);
      setDeleteResult({ error: "Failed to run auto cleanup" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl text-white mb-6">🔧 Alias Debug Manager</h1>

        {/* Auto Cleanup Button */}
        <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
          <h2 className="text-xl text-white mb-4">🚀 Automatic Cleanup (Recommended)</h2>
          <p className="text-gray-300 text-sm mb-4">
            This will automatically find and delete all orphaned aliases (Dig1nt1, Abir, AbirHere) where the user no longer exists.
          </p>
          <Button
            onClick={handleAutoCleanup}
            disabled={isDeleting}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            size="lg"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cleaning up...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-5 w-5" />
                Run Auto Cleanup Now
              </>
            )}
          </Button>
        </Card>

        {/* Quick Delete Buttons */}
        <Card className="p-6 bg-black/60 border-white/20">
          <h2 className="text-xl text-white mb-4">Manual Delete (Individual)</h2>
          <div className="flex gap-4">
            <Button
              onClick={() => deleteSpecificAlias("Dig1nt1")}
              disabled={isDeleting}
              variant="destructive"
              className="flex-1"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete "Dig1nt1"
            </Button>
            <Button
              onClick={() => deleteSpecificAlias("Abir")}
              disabled={isDeleting}
              variant="destructive"
              className="flex-1"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete "Abir"
            </Button>
          </div>
        </Card>

        {/* Check Alias Status */}
        <Card className="p-6 bg-black/60 border-white/20">
          <h2 className="text-xl text-white mb-4">Check Alias Status</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="check-alias" className="text-white/80">Alias to Check</Label>
                <Input
                  id="check-alias"
                  value={aliasToCheck}
                  onChange={(e) => setAliasToCheck(e.target.value)}
                  placeholder="Enter alias..."
                  className="mt-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckAlias()}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCheckAlias}
                  disabled={isChecking || !aliasToCheck.trim()}
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {checkResult && (
              <div className={`p-4 rounded-lg ${
                checkResult.exists 
                  ? checkResult.userExists 
                    ? 'bg-yellow-500/10 border border-yellow-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                  : 'bg-green-500/10 border border-green-500/20'
              }`}>
                <p className="text-white font-medium mb-2">{checkResult.message}</p>
                {checkResult.exists && (
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Alias Key: <code className="bg-white/10 px-2 py-1 rounded">{checkResult.aliasKey}</code></p>
                    <p>User ID: <code className="bg-white/10 px-2 py-1 rounded">{checkResult.userId}</code></p>
                    <p>User Exists: <span className={checkResult.userExists ? 'text-green-400' : 'text-red-400'}>
                      {checkResult.userExists ? 'Yes' : 'No (Orphaned)'}
                    </span></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Delete Alias */}
        <Card className="p-6 bg-black/60 border-white/20">
          <h2 className="text-xl text-white mb-4">Delete Specific Alias</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="delete-alias" className="text-white/80">Alias to Delete</Label>
                <Input
                  id="delete-alias"
                  value={aliasToDelete}
                  onChange={(e) => setAliasToDelete(e.target.value)}
                  placeholder="Enter alias to delete..."
                  className="mt-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleDeleteAlias()}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleDeleteAlias}
                  disabled={isDeleting || !aliasToDelete.trim()}
                  variant="destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>

            {deleteResult && (
              <div className={`p-4 rounded-lg ${
                deleteResult.success 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <p className="text-white font-medium mb-2">{deleteResult.message}</p>
                {deleteResult.success && deleteResult.previousUserId && (
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Deleted Alias: <code className="bg-white/10 px-2 py-1 rounded">{deleteResult.deletedAlias}</code></p>
                    <p>Previous User ID: <code className="bg-white/10 px-2 py-1 rounded">{deleteResult.previousUserId}</code></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="text-center text-gray-400 text-sm">
          <p>This is a debug tool. Use it to manually clean up orphaned aliases.</p>
          <p className="mt-2">Once you're done, you can remove this component from App.tsx</p>
        </div>
      </div>
    </div>
  );
}
