import ProfileSidebar from "../../../../components/patient/Profile/ProfileSidebar/ProfileSidebar"
import styles from "./MyProfile.module.css"
export default function MyProfile(){
    return(
        <div className={styles.containerMain}>
            <div className={styles.profileSidebar}>
                <ProfileSidebar/>
            </div>
        </div>
    )
}