import ProfileSidebar from "../../../../components/patient/Profile/ProfileSidebar/ProfileSidebar"
import PersonalInfo from "../../../../components/patient/Profile/PersonalInfo/PersonalInfo"
import styles from "./MyProfile.module.css"
export default function MyProfile(){
    return(
        <div className={styles.containerMain}>
            <div className={styles.profileSidebar}>
                <ProfileSidebar/>
            </div>
            <div className={styles.personalInfo}>
                <PersonalInfo/>
            </div>
        </div>
    )
}