import {
	Box,
	Button,
	CircularProgress,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography
} from "@mui/material"
import { useEffect, useState } from "react"
import { fetchDocumentsApi, fetchMyDocumentsApi } from "~/services/document.service"
import DocumentCreate from "./DocumentCreate"
import { useSelector } from "react-redux"

export default function DocumentList() {
	const [documents, setDocuments] = useState([])
	const [loading, setLoading] = useState(true)
	const [showCreate, setShowCreate] = useState(false)

	const account = useSelector((state) => state.account.value)
	const accessToken = localStorage.getItem("accessToken")

	const fetchList = async () => {
		setLoading(true)
		let res
		if (account.role === "ADMIN" || account.role === "MANAGER") {
			res = await fetchDocumentsApi(accessToken)
		} else if (account.role === "PM") {
			res = await fetchMyDocumentsApi(accessToken)
		} else {
			res = { status: 403, data: [] }
		}
		if (res.status === 200) setDocuments(res.data)
		else setDocuments([])
		setLoading(false)
	}

	useEffect(() => {
		fetchList()
	}, [account.role])

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto", p: 3 }}>
			<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
				<Typography sx={{ flex: 1, fontSize: 22, fontWeight: 600 }}>
					Danh sách công văn
				</Typography>
				{(account.role === "ADMIN" || account.role === "MANAGER") && (
					<Button variant="contained" onClick={() => setShowCreate(true)}>
						Tạo công văn mới
					</Button>
				)}
			</Box>
			{showCreate && (
				<Box
					sx={{
						position: "fixed",
						zIndex: 20,
						left: 0,
						top: 0,
						width: "100vw",
						height: "100vh",
						bgcolor: "rgba(0,0,0,0.22)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<DocumentCreate
						onSuccess={() => {
							setShowCreate(false)
							fetchList()
						}}
						onCancel={() => setShowCreate(false)}
					/>
				</Box>
			)}
			<Paper sx={{ mt: 2, overflow: "auto" }}>
				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Tiêu đề</TableCell>
								<TableCell>Người tạo</TableCell>
								<TableCell>Quản lý dự án</TableCell>
								<TableCell>Ngày tạo</TableCell>
								<TableCell>Trạng thái</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={5} align="center">
										<CircularProgress size={22} />
									</TableCell>
								</TableRow>
							) : documents.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} align="center">
										<Typography color="text.secondary">
											Không có công văn nào.
										</Typography>
									</TableCell>
								</TableRow>
							) : (
								documents.map((doc) => (
									<TableRow key={doc.id}>
										<TableCell>{doc.title}</TableCell>
										<TableCell>{doc.createdBy}</TableCell>
										<TableCell>{doc.projectManager}</TableCell>
										<TableCell>
											{new Date(doc.createdAt).toLocaleString()}
										</TableCell>
										<TableCell>{doc.status}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</Paper>
		</Box>
	)
}
