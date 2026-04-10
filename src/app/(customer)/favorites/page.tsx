"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart, MapPin, ArrowRight, Trash2 } from "lucide-react";
import { customerApi } from "@/lib/api";
import type { FavoriteSalon } from "@/lib/api";
import { Spinner } from "@/components/ui";
import { toast } from "sonner";
import { useLocale } from "@/components/LocaleProvider";
import { getPublicT, type PublicLocale, type PublicI18nKey } from "@/lib/i18n-public";

const LOCALE_BCP47: Record<PublicLocale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn",
  fr: "fr-FR",
};

export default function FavoritesPage() {
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const bcp = LOCALE_BCP47[locale] ?? "en-US";

  const [favorites, setFavorites] = useState<FavoriteSalon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await customerApi.myFavorites();
      if (error) {
        toast.error(error);
      } else if (data) {
        setFavorites(data.favorites ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const removeFavorite = useCallback(
    async (salonId: string) => {
      const { error } = await customerApi.removeFavoriteSalon(salonId);
      if (error) {
        toast.error(error);
        return;
      }
      setFavorites((prev) => prev.filter((f) => String(f.salon?.id ?? f.salon_id) !== salonId));
      toast.success(t("removeFavoriteConfirm"));
    },
    [t],
  );

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(bcp, { year: "numeric", month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("favoritesPageTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("favoritesPageSubtitle")}</p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {favorites.map((fav) => {
            const salon = fav.salon;
            const salonId = salon?.id ?? fav.salon_id;
            const salonName = salon?.name ?? t("salonFallbackName");
            const initial = salonName.charAt(0).toUpperCase();

            return (
              <div
                key={fav.id}
                className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Logo or initial */}
                  {salon?.logo ? (
                    <img
                      src={salon.logo}
                      alt={salonName}
                      className="w-12 h-12 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {initial}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/book?salon_id=${salonId}`}
                      className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {salonName}
                    </Link>
                    {salon?.address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{salon.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Added date */}
                {fav.created_at && (
                  <p className="text-[11px] text-muted-foreground">
                    {t("addedOnDate").replace("{date}", fmtDate(fav.created_at))}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Link
                    href={`/book?salon_id=${salonId}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-colors"
                  >
                    {t("bookNowShort")}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFavorite(String(salonId))}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ t }: { t: (key: PublicI18nKey) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Heart className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">{t("noFavoritesYet")}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{t("noFavoritesDesc")}</p>
      <Link
        href="/book"
        className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-colors shadow-sm"
      >
        {t("browseSalons")}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
