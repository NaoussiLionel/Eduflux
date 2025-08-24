'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  avatar_url: string;
  total_score: number;
};

type MyRank = {
  rank: number;
  total_score: number;
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const [leaderboardRes, myRankRes] = await Promise.all([
          fetch('/api/leaderboard'),
          fetch('/api/leaderboard/my-rank'),
        ]);

        if (!leaderboardRes.ok) throw new Error('Failed to fetch leaderboard data.');
        if (!myRankRes.ok) throw new Error('Failed to fetch your rank.');
        
        const leaderboardData = await leaderboardRes.json();
        const myRankData = await myRankRes.json();

        setLeaderboard(leaderboardData);
        setMyRank(myRankData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
          <Link href="/dashboard" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            &larr; Back to Dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {myRank && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 flex items-center border-2 border-indigo-500">
            <span className="text-lg font-bold text-indigo-600 w-10">{myRank.rank}</span>
            <div className="ml-4">
              <p className="text-lg font-medium text-gray-900">Your Rank</p>
            </div>
            <div className="ml-auto">
              <p className="text-xl font-bold text-indigo-600">{myRank.total_score.toLocaleString()} pts</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul role="list" className="divide-y divide-gray-200">
            {isLoading && <li className="p-6 text-center">Loading...</li>}
            {error && <li className="p-6 text-center text-red-500">{error}</li>}
            {leaderboard.map((user, index) => (
              <li key={user.user_id} className="p-4 sm:p-6 flex items-center">
                <span className="text-lg font-bold text-gray-500 w-10">{index + 1}</span>
                <img className="h-12 w-12 rounded-full" src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} alt="" />
                <div className="ml-4">
                  <p className="text-lg font-medium text-gray-900">{user.full_name || 'Anonymous User'}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-xl font-bold text-indigo-600">{user.total_score.toLocaleString()} pts</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}