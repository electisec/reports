import { useState, useMemo } from "react";
import { GetStaticProps } from "next";
import SearchBar from "../components/SearchBar";
import ReportCard from "../components/ReportCard";
import matter from "gray-matter";
import path from "path";
import fs from "fs";
import { extractDate } from "@/lib/utils";

interface Report {
  title: string;
  description: string;
  date: string;
  slug: string;
  author: string;
  tags: string[];
}

interface HomeProps {
  reports: Report[];
}

export default function Home({ reports }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const tags = reports
    .map((report) => report.tags) 
    .flat() 
    .filter((tag) => tag.trim() !== "") 
    .reduce((unique, tag) => {
      if (!unique.includes(tag)) unique.push(tag); 
      return unique;
    }, [] as string[]);

  const filteredReports = useMemo(() => {
    const query = searchQuery?.toLowerCase();
    return reports
      .filter(
        (report) =>
          report?.title?.toLowerCase().includes(query) ||
          report?.description?.toLowerCase().includes(query) ||
          report?.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
      .filter((report) => {
        if (selectedTags.length === 0) return true;
        return report.tags.some((tag) => selectedTags.includes(tag));
      });
  }, [searchQuery, reports, selectedTags]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 mb-8 text-gray-400">
          <SearchBar onSearch={handleSearch} />
          <div className="flex flex-wrap gap-2 mx-auto mt-4 justify-center">
            {tags.map((tag, index) => (
              <button
                key={index}
                className={
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-md font-medium bg-emeraldlight bg-opacity-25 text-darkgreen hover:bg-opacity-5 duration-700" +
                  (selectedTags.includes(tag)
                    ? " bg-emerald bg-opacity-25 text-darkgreen"
                    : "")
                }
                onClick={() =>
                  setSelectedTags((prevTags) =>
                    prevTags.includes(tag)
                      ? prevTags.filter((t) => t !== tag)
                      : [...prevTags, tag]
                  )
                }
              >
                {tag} {selectedTags.includes(tag) && "x"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 px-4 sm:px-0 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.length > 0 ? (
            filteredReports.map((report, index) => (
              <ReportCard key={index} {...report} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">
                {searchQuery
                  ? "No reports found matching your search."
                  : "No reports available."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const reportsDirectory = path.join(process.cwd(), "content");
    const filenames = fs.readdirSync(reportsDirectory);

    const reports = filenames
      .filter((filename) => filename.endsWith(".md"))
      .map((filename) => {
        const filePath = path.join(reportsDirectory, filename);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const { data: frontmatter } = matter(fileContent);

        return {
          slug: filename.replace(".md", ""),
          title:
            (frontmatter.title &&
              frontmatter.title?.split("-").slice(2).join(" ")) ||
            filename,
          date: extractDate(filename.replace(".md", "")) || new Date(),
          description: frontmatter.description || null,
          tags: frontmatter.tags || [],
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    return {
      props: {
        reports,
      },
      // Revalidate every hour
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return {
      props: {
        reports: [],
      },
      revalidate: 3600,
    };
  }
};
