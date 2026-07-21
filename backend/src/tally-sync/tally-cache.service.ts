import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CacheEntry = {
  expiresAt: number;
};

@Injectable()
export class TallyCacheService {
  private readonly ledgerCache = new Map<string, CacheEntry>();
  private readonly stockItemCache = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {}

  hasLedger(name: string): boolean {
    return this.has(this.ledgerCache, name);
  }

  rememberLedger(name: string): void {
    this.remember(this.ledgerCache, name);
  }

  forgetLedger(name: string): void {
    this.ledgerCache.delete(this.normalizeName(name));
  }

  hasStockItem(name: string): boolean {
    return this.has(this.stockItemCache, name);
  }

  rememberStockItem(name: string): void {
    this.remember(this.stockItemCache, name);
  }

  forgetStockItem(name: string): void {
    this.stockItemCache.delete(this.normalizeName(name));
  }

  clear(): void {
    this.ledgerCache.clear();
    this.stockItemCache.clear();
  }

  getStats(): {
    ledgers: number;
    stockItems: number;
    ttlMilliseconds: number;
  } {
    this.removeExpired(this.ledgerCache);
    this.removeExpired(this.stockItemCache);

    return {
      ledgers: this.ledgerCache.size,
      stockItems: this.stockItemCache.size,
      ttlMilliseconds: this.getTtlMilliseconds(),
    };
  }

  private has(cache: Map<string, CacheEntry>, name: string): boolean {
    const key = this.normalizeName(name);
    const entry = cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return false;
    }

    return true;
  }

  private remember(cache: Map<string, CacheEntry>, name: string): void {
    cache.set(this.normalizeName(name), {
      expiresAt: Date.now() + this.getTtlMilliseconds(),
    });
  }

  private removeExpired(cache: Map<string, CacheEntry>): void {
    const now = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
      }
    }
  }

  private getTtlMilliseconds(): number {
    const configuredSeconds = Number(
      this.configService.get<string>('TALLY_MASTER_CACHE_TTL_SECONDS', '900'),
    );

    const seconds =
      Number.isFinite(configuredSeconds) && configuredSeconds > 0
        ? configuredSeconds
        : 900;

    return seconds * 1_000;
  }

  private normalizeName(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
