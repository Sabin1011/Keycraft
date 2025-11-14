const User = require("../../models/userSchema");




// Load User Management Page with Search and Pagination
const loadUserManage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2; // 10 users per page
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";

    // Build search query
    let searchQuery = { isAdmin: false }; // Only get non-admin users
    
    if (search && search !== "") {
      searchQuery = {
        isAdmin: false,
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Fetch users with pagination
    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    res.render("userManage", {
      users,
      currentPage: page,
      totalUsers,
      limit,
      search: search,
      success: req.session.success || null,
      error: req.session.error || null,
    });

    // Clear session messages after rendering
    delete req.session.success;
    delete req.session.error;

  } catch (error) {
    console.error("Error loading user manage page:", error);
    res.status(500).render("userManage", {
      users: [],
      currentPage: 1,
      totalUsers: 0,
      limit: 10,
      search: "",
      error: "Failed to load users",
    });
  }
};

// Block/Unblock User (Toggle Status)
const blockUser = async (req, res) => {
  try { 
    const userId = req.params.id;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow blocking admins
    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Cannot block admin users",
      });
    }

    // Toggle status (true -> false, false -> true)
    user.status = !user.status;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.status ? "unblocked" : "blocked"} successfully`,
      newStatus: user.status,
    });

  } catch (error) {
    console.error("Error toggling user status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




module.exports = {
    loadUserManage,
    blockUser,

}