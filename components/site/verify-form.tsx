"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Spinner } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

/** Small client form: resolves a verification code to /verify/<code>. */
export function VerifyForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim().toUpperCase();
        if (!value) return;
        setPending(true);
        router.push(`/verify/${encodeURIComponent(value)}`);
      }}
    >
      <Label htmlFor="verification-code" hint="Printed on the cover of a released report, e.g. NS-2026-7K4Q.">
        Verification code
      </Label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          id="verification-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="NS-2026-XXXX"
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          className="font-mono uppercase sm:flex-1"
          aria-describedby="verification-help"
        />
        <Button type="submit" disabled={pending || code.trim().length < 4}>
          {pending ? <Spinner /> : <Search className="h-4 w-4" />}
          Verify
        </Button>
      </div>
      <p id="verification-help" className="mt-2 text-xs leading-5 text-muted">
        Verification confirms that a report version exists in the counselling
        record. It does not confirm that any admission, placement or salary
        outcome will follow.
      </p>
    </form>
  );
}
