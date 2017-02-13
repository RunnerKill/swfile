<%@ page language="java" pageEncoding="UTF-8"%>
<%
String act = request.getParameter("act");
String json = request.getParameter("json");
String param = json == null ? "" : json;
%>

<script type="text/javascript">
window.parent.swfile.callback('<%=act %>', <%=param %>, window);
</script>
