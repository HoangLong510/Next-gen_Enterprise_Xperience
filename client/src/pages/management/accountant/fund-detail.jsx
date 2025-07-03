import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Paper,
  TableContainer,
} from "@mui/material";
import { getFundByIdApi, getTransactionsApi  } from "~/services/accountant/fund.service";


export default function FundDetails({ accessToken }) {
  const { fundId } = useParams();
  const navigate = useNavigate();

  const [fund, setFund] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [fundId]);

  const fetchData = async () => {
    setLoading(true);

    const fundRes = await getFundByIdApi(fundId, accessToken);
    if (fundRes?.status === 200) {
      setFund(fundRes.data);
    } else {
      setFund(null);
    }

    const txRes = await getTransactionsApi(fundId, accessToken);
    if (txRes?.status === 200) {
      setTransactions(txRes.data);
    } else {
      setTransactions([]);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Box p={2}>
        <CircularProgress />
      </Box>
    );
  }

  if (!fund) {
    return (
      <Box p={2}>
        <Typography>No fund found.</Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      <Typography variant="h4" gutterBottom>
        Fund Details
      </Typography>

      {/* Fund Basic Info */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography variant="body1">
          <b>Name:</b> {fund.name}
        </Typography>
        <Typography variant="body1">
          <b>Balance:</b> {fund.balance?.toLocaleString()}
        </Typography>
        <Typography
          component="div"
          variant="body1"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <b>Status:</b>
          <Chip
            label={fund.status}
            color={fund.status === "ACTIVE" ? "success" : "default"}
            size="small"
            sx={{ ml: 1 }}
          />
        </Typography>
        <Typography variant="body1">
          <b>Purpose:</b> {fund.purpose}
        </Typography>
        <Typography variant="body1">
          <b>Created By:</b> {fund.createdBy}
        </Typography>
        <Typography variant="body1">
          <b>Created At:</b>{" "}
          {fund.createdAt ? new Date(fund.createdAt).toLocaleString() : "-"}
        </Typography>
      </Box>

      {/* Transactions */}
      <Typography variant="h5" sx={{ mb: 1 }}>
        Transactions
      </Typography>

      {transactions.length === 0 ? (
        <Typography>No transactions available.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
                <TableCell>
                  <b>Time</b>
                </TableCell>
                <TableCell>
                  <b>Type</b>
                </TableCell>
                <TableCell>
                  <b>Amount</b>
                </TableCell>
                <TableCell>
                  <b>Note</b>
                </TableCell>
                <TableCell>
                  <b>Created By</b>
                </TableCell>
                <TableCell>
                  <b>Attachment</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx, index) => (
                <TableRow
                  key={tx.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                  }}
                >
                  <TableCell>
                    {tx.createdAt
                      ? new Date(tx.createdAt).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tx.type}
                      color={tx.type === "INCREASE" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{tx.amount?.toLocaleString()}</TableCell>
                  <TableCell>{tx.note}</TableCell>
                  <TableCell>{tx.createdBy}</TableCell>
                  <TableCell>
                    {tx.fileUrl ? (
                      /\.(jpe?g|png|gif)$/i.test(tx.fileName) ? (
                        <img
                          src={`http://localhost:4040/api${tx.fileUrl}`}
                          alt={tx.fileName}
                          style={{
                            maxWidth: 80,
                            maxHeight: 80,
                            borderRadius: 4,
                            cursor: "pointer",
                            boxShadow: "0 0 4px rgba(0,0,0,0.2)",
                          }}
                          onClick={() =>
                            window.open(`http://localhost:4040/api${tx.fileUrl}`)
                          }
                        />
                      ) : (
                        <a
                          href={`http://localhost:4040/api${tx.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View File
                        </a>
                      )
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
