"use client";

interface BottomNavProps {
    currentTab: 'myid' | 'lookup';
    onTabChange: (tab: 'myid' | 'lookup') => void;
}

export default function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="max-w-sm mx-auto flex">
                {/* My ID Tab */}
                <button
                    onClick={() => onTabChange('myid')}
                    className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${currentTab === 'myid'
                            ? 'text-[#0052FF] bg-blue-50'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                        />
                    </svg>
                    <span className="text-xs font-bold">My ID</span>
                </button>

                {/* Lookup Tab */}
                <button
                    onClick={() => onTabChange('lookup')}
                    className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${currentTab === 'lookup'
                            ? 'text-[#0052FF] bg-blue-50'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <span className="text-xs font-bold">Lookup</span>
                </button>
            </div>
        </div>
    );
}
