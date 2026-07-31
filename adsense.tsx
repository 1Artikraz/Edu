export function AdSenseSlot({ slot = "1234567890", format = "auto" }: { slot?: string; format?: string }) {
  return (
    <div className="w-full rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-6 gap-1.5">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: 90 }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <span className="text-[10px] text-muted-foreground/40">Advertisement</span>
    </div>
  );
}
