import { AdminDataType } from "../../common/types";
import { DateTime } from "luxon";
import { Utils } from "../../common/utils";
import { TruncatedTextCell } from "../../components/truncated-text-call";
import { Button } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

function ViewDetailsButton({ evaluationId }) {
  const navigate = useNavigate();
  console.log("evaluationId: ", evaluationId);

  const viewDetailedEvaluation = (evaluationId) => {
    navigate(`/admin/llm-evaluation/${evaluationId}`);
  };

  return (
    <Button onClick={() => viewDetailedEvaluation(evaluationId)} variant="link">
      View Details
    </Button>
  );
}

const FILES_COLUMN_DEFINITIONS = [
  {
    id: "name",
    header: "Name",
    cell: (item) => item.Key!,
    isRowHeader: true,
  },
  {
    id: "createdAt",
    header: "Upload date",
    cell: (item) =>
      DateTime.fromISO(new Date(item.LastModified).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
  },
  {
    id: "size",
    header: "Size",
    cell: (item) => Utils.bytesToSize(item.Size!),
  },
];

const FEEDBACK_COLUMN_DEFINITIONS = [
  {
    id: "problem",
    header: "Problem",
    cell: (item) => item.Problem,
    isRowHeader: true,
  },
  {
    id: "topic",
    header: "Topic",
    cell: (item) => item.Topic,
    isRowHeader: true,
  },
  {
    id: "createdAt",
    header: "Submission date",
    cell: (item) =>
      DateTime.fromISO(new Date(item.CreatedAt).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
  },
  {
    id: "prompt",
    header: "User Prompt",
    cell: (item) => item.UserPrompt,
    isRowHeader: true
  },

];

const EVAL_SUMMARY_COLUMN_DEFINITIONS = [
  { 
    id: "evaluationName",
    header: "Evaluation Name",
    cell: (item) => <TruncatedTextCell text={item.evaluation_name || "Unnamed Evaluation"} maxLength={50}/>
  },
  {
    id: "evalTestCaseKey",
    header: "Test Case Filename",
    cell: (item) => <TruncatedTextCell text={item.test_cases_key || "Unnamed Test Case"} maxLength={50}/>
  },
  {
    id: "timestamp",
    header: "Timestamp",
    //cell: (item) => new Date(item.timestamp).toLocaleString(),
    cell: (item) =>
      DateTime.fromISO(new Date(item.Timestamp).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
    sortingField: "Timestamp",
    sortingComparator: (a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
  },
  {
    id: "averageSimilarity",
    header: "Average Similarity",
    cell: (item) =>
      (
        parseFloat(item.average_similarity) 
      ).toFixed(2),
    sortingField: "average_similarity",
    sortingComparator: (a, b) => parseFloat(a.average_similarity) - parseFloat(b.average_similarity),
    width: "10%",
    wrapText: true
  },
  {
    id: "averageRelevance",
    header: "Average Relevance",
    cell: (item) =>
    (
      parseFloat(item.average_relevance) 
    ).toFixed(2),
    sortingField: "average_relevance",
    sortingComparator: (a, b) => parseFloat(a.average_relevance) - parseFloat(b.average_relevance),
    width: "10%",
    wrapText: true
  },
  {
    id: "averageCorrectness",
    header: "Average Correctness",
    cell: (item) =>
    (
      parseFloat(item.average_correctness) 
    ).toFixed(2),
    sortingField: "average_correctness",
    sortingComparator: (a, b) => parseFloat(a.average_correctness) - parseFloat(b.average_correctness),
    width: "10%",
    wrapText: true 
  },
  {
    id: "viewDetails",
    header: "View Details",
    cell: (item) => <ViewDetailsButton evaluationId={item.EvaluationId}/>,
    disableSort: true
  }, 
];

const DETAILED_EVAL_COLUMN_DEFINITIONS = [
  {
    id: "question",
    header: "Question",
    cell: (item) => <TruncatedTextCell text={item.question} maxLength={50}/>
  },
  {
    id: "expectedResponse",
    header: "Expected Response",
    cell: (item) => <TruncatedTextCell text={item.expected_response} maxLength={50}/>
  },
  {
    id: "actualResponse",
    header: "Actual Response",
    cell: (item) => <TruncatedTextCell text={item.actual_response} maxLength={50}/>
  },
  {
    id: "similarity",
    header: "Similarity",
    cell: (item) =>
      (
        parseFloat(item.similarity) 
      ).toFixed(2),
    sortingField: "similarity"
  },
  {
    id: "relevance",
    header: "Relevance",
    cell: (item) =>
    (
      parseFloat(item.relevance) 
    ).toFixed(2),
    sortingField: "relevance"
  },
  {
    id: "correctness",
    header: "Correctness",
    cell: (item) =>
    (
      parseFloat(item.correctness) 
    ).toFixed(2),
    sortingField: "correctness"
  },
];

// should include the prompt itself with the option to show more
const PromptColumnDefinitions = [
  {
    id: "prompt",
    header: "Prompt",
    cell: (item) => <TruncatedTextCell text={item.Prompt} maxLength={150}/>
  },
  {
    id: "createdAt",
    header: "Upload date",
    cell: (item) =>
      DateTime.fromISO(new Date(item.Timestamp).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
  },
];

/** This is exposed as a function because the code that this is based off of
 * originally supported many more distinct file types.
 */
export function getColumnDefinition(documentType: AdminDataType) {
  switch (documentType) {
    case "file":
      return FILES_COLUMN_DEFINITIONS;   
    case "feedback":
      return FEEDBACK_COLUMN_DEFINITIONS;
    case "evaluationSummary":
      return EVAL_SUMMARY_COLUMN_DEFINITIONS;
    case "detailedEvaluation":
      return DETAILED_EVAL_COLUMN_DEFINITIONS;
    case "prompt":
      return PromptColumnDefinitions;
    default:
      return [];
  }
}