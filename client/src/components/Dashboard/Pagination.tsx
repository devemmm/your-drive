import React from "react";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ setPage, page, totalPages, t }) {
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {/* Previous Button with icon */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        disabled={page === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Page Numbers */}
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((pageNumber) => {
          return (
            pageNumber === page || // current
            pageNumber === page - 1 || // previous
            pageNumber === page + 1 // next
          );
        })
        .map((pageNumber) => (
          <Button
            key={pageNumber}
            size="sm"
            variant={pageNumber === page ? "default" : "outline"}
            onClick={() => setPage(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}

      {/* Next Button with icon */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={page === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
