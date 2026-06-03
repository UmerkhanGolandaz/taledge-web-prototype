"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Report {
  candidateName: string;
  targetRole: string;
  skills: string[];
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  strengths: string[];
  areasForImprovement: string[];
  recommendation: string;
  summary: string;
  detailedFeedback: string;
  answers: string[];
  generatedAt: number;
}

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("interview:report");
    if (saved) {
      try {
        setReport(JSON.parse(saved));
      } catch {
        router.push("/interview");
      }
    } else {
      router.push("/interview");
    }
  }, [router]);

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading report...</div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.toLowerCase().includes("hire")) return "bg-green-100 text-green-700 border-green-200";
    if (rec.toLowerCase().includes("consider")) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">AI</div>
            <div>
              <div className="text-sm font-semibold">Interview Report</div>
              <div className="text-xs text-gray-500">AI Interview Report</div>
            </div>
          </div>
          <button
            onClick={() => router.push("/interview")}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            New Interview
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Candidate Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{report.candidateName}</h1>
              <p className="text-gray-500 mt-1">{report.targetRole}</p>
            </div>
            <div className={`px-4 py-2 rounded-xl font-semibold border ${getRecommendationColor(report.recommendation)}`}>
              {report.recommendation}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {report.skills.map(skill => (
              <span key={skill} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{skill}</span>
            ))}
          </div>
        </div>

        {/* Scores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Scores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreCard label="Overall" score={report.overallScore} />
            <ScoreCard label="Technical" score={report.technicalScore} />
            <ScoreCard label="Communication" score={report.communicationScore} />
            <ScoreCard label="Problem Solving" score={report.problemSolvingScore} />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
          <p className="text-gray-700 leading-relaxed">{report.summary}</p>
        </div>

        {/* Strengths */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Strengths</h2>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                <span className="text-gray-700">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Areas for Improvement</h2>
          <ul className="space-y-2">
            {report.areasForImprovement.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                <span className="text-gray-700">{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Detailed Feedback */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Detailed Feedback</h2>
          <p className="text-gray-700 leading-relaxed">{report.detailedFeedback}</p>
        </div>

        {/* Answers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Answers</h2>
          <div className="space-y-4">
            {report.answers.map((answer, i) => (
              <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="text-xs text-gray-500 mb-1">Question {i + 1}</div>
                <p className="text-gray-700 text-sm">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="text-center p-4 bg-gray-50 rounded-xl">
      <div className={`text-3xl font-bold ${getColor(score)}`}>{score}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}