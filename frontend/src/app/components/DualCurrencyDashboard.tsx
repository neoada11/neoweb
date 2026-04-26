import { useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Loader2,
  Menu,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react';

interface PriceComparison {
  strikePrice: number;
  direction: 'up' | 'down';
  okxAPY: number | null;
  bitgetAPY: number | null;
  binanceAPY: number | null;
  settlementDate: string;
}

interface CurrencyInfo {
  currentPrice: number;
  change24h: number;
}

const currencies = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'] as const;
const settlementDates = ['2026-03-27', '2026-03-26', '2026-03-25', '2026-03-24'] as const;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const currencyPrices: Record<(typeof currencies)[number], CurrencyInfo> = {
  'BTC/USDT': { currentPrice: 67500, change24h: 2.3 },
  'ETH/USDT': { currentPrice: 3750, change24h: -1.2 },
  'SOL/USDT': { currentPrice: 142, change24h: 5.6 },
  'BNB/USDT': { currentPrice: 595, change24h: 1.8 },
};

function formatPercent(value: number | null) {
  if (value === null) {
    return '-';
  }

  return `${value}%`;
}

function getHighestAPY(comparison: PriceComparison) {
  const values = [comparison.okxAPY, comparison.bitgetAPY, comparison.binanceAPY].filter(
    (value): value is number => value !== null,
  );

  return values.length > 0 ? Math.max(...values) : null;
}

function exchangeBadgeClass(isHighest: boolean, mobile = false) {
  if (isHighest) {
    return mobile ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700';
  }

  return mobile ? 'bg-slate-100 text-slate-900' : 'text-slate-900';
}

function ExchangeValue({
  label,
  value,
  highest,
  mobile = false,
  dotClassName,
}: {
  label: string;
  value: number | null;
  highest: boolean;
  mobile?: boolean;
  dotClassName?: string;
}) {
  if (mobile) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${dotClassName ?? 'bg-slate-900'}`}></div>
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        {value !== null ? (
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${exchangeBadgeClass(
              highest,
              true,
            )}`}
          >
            {formatPercent(value)}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </div>
    );
  }

  return value !== null ? (
    <span className={`inline-block rounded-lg px-4 py-2 font-medium ${exchangeBadgeClass(highest)}`}>
      {formatPercent(value)}
    </span>
  ) : (
    <span className="text-slate-400">-</span>
  );
}

export function DualCurrencyDashboard() {
  const [selectedCurrency, setSelectedCurrency] = useState<(typeof currencies)[number]>('BTC/USDT');
  const [selectedDate, setSelectedDate] = useState<(typeof settlementDates)[number]>('2026-03-27');
  const [activeNav, setActiveNav] = useState<'dual-currency' | 'lending'>('dual-currency');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<PriceComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          currency: selectedCurrency,
          date: selectedDate,
        });

        const response = await fetch(`${apiBaseUrl}/api/dual-currency?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const result: { data: PriceComparison[] } = await response.json();
        setData(result.data ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Failed to fetch dual currency data:', fetchError);
        setError('获取数据失败，请确认后端服务已启动后重试');
        setData([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => controller.abort();
  }, [reloadToken, selectedCurrency, selectedDate]);

  const currentPriceInfo = currencyPrices[selectedCurrency];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900">CryptoCompare</span>
              <p className="hidden text-xs text-slate-500 sm:block">加密货币产品对比平台</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl bg-slate-100 p-1.5 md:flex">
            <button
              onClick={() => setActiveNav('dual-currency')}
              className={`relative rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeNav === 'dual-currency'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {activeNav === 'dual-currency' && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 opacity-60"></div>
              )}
              <span className="relative flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                双币赢
              </span>
            </button>
            <button
              onClick={() => setActiveNav('lending')}
              className={`relative rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeNav === 'lending'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {activeNav === 'lending' && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 opacity-60"></div>
              )}
              <span className="relative flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                理财借贷
              </span>
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6">
              <button
                onClick={() => {
                  setActiveNav('dual-currency');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                  activeNav === 'dual-currency'
                    ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600'
                    : 'border-transparent text-slate-700 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                双币赢
              </button>
              <button
                onClick={() => {
                  setActiveNav('lending');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                  activeNav === 'lending'
                    ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600'
                    : 'border-transparent text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                理财借贷
              </button>
            </div>
          </div>
        )}
      </nav>

      {activeNav === 'dual-currency' ? (
        <>
          <header className="sticky top-16 z-10 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">交易对</label>
                    <div className="relative">
                      <select
                        value={selectedCurrency}
                        onChange={(event) =>
                          setSelectedCurrency(event.target.value as (typeof currencies)[number])
                        }
                        className="min-w-[140px] appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-base font-bold text-slate-900 shadow-sm transition-shadow hover:shadow-md focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {currencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">实时价格</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        ${currentPriceInfo.currentPrice.toLocaleString()}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          currentPriceInfo.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {currentPriceInfo.change24h >= 0 ? '▲' : '▼'}
                        {Math.abs(currentPriceInfo.change24h)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">结算日期</label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {settlementDates.map((date) => (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow-md ${
                            selectedDate === date
                              ? 'scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {date.slice(5)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setReloadToken((token) => token + 1)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      刷新数据
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-600">正在加载双币赢报价...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-white p-12 text-center shadow-sm">
                <p className="mb-4 text-red-600">{error}</p>
                <button
                  onClick={() => setReloadToken((token) => token + 1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  重试
                </button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50">
                          <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                            行权价格
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                            方向
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                            <div className="flex flex-col items-center gap-1">
                              <span>OKX</span>
                              <span className="text-xs font-medium text-slate-500">年化收益率</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                            <div className="flex flex-col items-center gap-1">
                              <span>Bitget</span>
                              <span className="text-xs font-medium text-slate-500">年化收益率</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                            <div className="flex flex-col items-center gap-1">
                              <span>币安</span>
                              <span className="text-xs font-medium text-slate-500">年化收益率</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.map((comparison) => {
                          const highestAPY = getHighestAPY(comparison);

                          return (
                            <tr
                              key={`${comparison.strikePrice}-${comparison.direction}`}
                              className="transition-colors hover:bg-slate-50"
                            >
                              <td className="px-6 py-4">
                                <span className="font-medium text-slate-900">
                                  ${comparison.strikePrice.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                                    comparison.direction === 'up'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {comparison.direction === 'up' ? '看涨' : '看跌'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <ExchangeValue
                                  label="OKX"
                                  value={comparison.okxAPY}
                                  highest={comparison.okxAPY !== null && comparison.okxAPY === highestAPY}
                                />
                              </td>
                              <td className="px-6 py-4 text-center">
                                <ExchangeValue
                                  label="Bitget"
                                  value={comparison.bitgetAPY}
                                  highest={
                                    comparison.bitgetAPY !== null &&
                                    comparison.bitgetAPY === highestAPY
                                  }
                                />
                              </td>
                              <td className="px-6 py-4 text-center">
                                <ExchangeValue
                                  label="币安"
                                  value={comparison.binanceAPY}
                                  highest={
                                    comparison.binanceAPY !== null &&
                                    comparison.binanceAPY === highestAPY
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {data.length === 0 && (
                    <div className="p-12 text-center">
                      <p className="text-slate-600">当前筛选条件下暂无数据</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 lg:hidden">
                  {data.map((comparison) => {
                    const highestAPY = getHighestAPY(comparison);

                    return (
                      <div
                        key={`${comparison.strikePrice}-${comparison.direction}`}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-slate-900">
                              行权价: ${comparison.strikePrice.toLocaleString()}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                comparison.direction === 'up'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {comparison.direction === 'up' ? '看涨' : '看跌'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 p-4">
                          <ExchangeValue
                            mobile
                            label="OKX"
                            value={comparison.okxAPY}
                            highest={comparison.okxAPY !== null && comparison.okxAPY === highestAPY}
                            dotClassName="bg-slate-900"
                          />
                          <ExchangeValue
                            mobile
                            label="Bitget"
                            value={comparison.bitgetAPY}
                            highest={
                              comparison.bitgetAPY !== null && comparison.bitgetAPY === highestAPY
                            }
                            dotClassName="bg-blue-600"
                          />
                          <ExchangeValue
                            mobile
                            label="币安"
                            value={comparison.binanceAPY}
                            highest={
                              comparison.binanceAPY !== null && comparison.binanceAPY === highestAPY
                            }
                            dotClassName="bg-yellow-500"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {data.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                      <p className="text-slate-600">当前筛选条件下暂无数据</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:mt-6 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded bg-green-100"></div>
                    <div>
                      <p className="text-xs font-medium text-slate-900 sm:text-sm">最高年化收益率</p>
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                        绿色高亮表示该行权价格下收益率最高的交易所
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-slate-900">理财借贷</h2>
            <p className="text-slate-600">此功能正在开发中...</p>
          </div>
        </div>
      )}

      <footer className="mt-8 border-t border-slate-200 bg-white sm:mt-12">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <p className="text-center text-xs text-slate-600 sm:text-sm">
            免责声明：页面样式来自 Figma Make 原型，实际投资请以各平台官方数据为准
          </p>
        </div>
      </footer>
    </div>
  );
}
